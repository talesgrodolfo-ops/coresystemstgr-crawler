import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ApiToken, CrawlFailure, CrawlItem, CrawlRun, CrawlTarget, StoreData } from './types.js'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const dbPath = resolve(rootDir, 'data', 'store.json')
const legacyTargets = resolve(rootDir, 'config', 'targets.json')

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function empty(): StoreData {
  return { targets: [], runs: [], items: [], failures: [], tokens: [] }
}

function migrateLegacy(data: StoreData): StoreData {
  if (data.targets.length || !existsSync(legacyTargets)) return data
  const legacy = JSON.parse(readFileSync(legacyTargets, 'utf-8')) as {
    targets: Array<{
      id: string
      name: string
      url: string
      fields: CrawlTarget['fields']
    }>
  }
  const now = new Date().toISOString()
  data.targets = legacy.targets.map((t) => ({
    id: t.id,
    name: t.name,
    url: t.url,
    enabled: true,
    crawl_mode: 'single' as const,
    allowed_url_patterns: [],
    stop_url_patterns: [],
    max_pages: 1,
    max_depth: 0,
    fields: t.fields,
    created_at: now,
    updated_at: now,
  }))
  return data
}

function load(): StoreData {
  mkdirSync(dirname(dbPath), { recursive: true })
  if (!existsSync(dbPath)) {
    const data = migrateLegacy(empty())
    writeFileSync(dbPath, JSON.stringify(data, null, 2))
    return data
  }
  const data = JSON.parse(readFileSync(dbPath, 'utf-8')) as StoreData
  if (!data.tokens) data.tokens = []
  if (!data.targets) data.targets = []
  return migrateLegacy(data)
}

function save(data: StoreData) {
  writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

export const store = {
  getTargets(enabledOnly = false) {
    const targets = load().targets
    return enabledOnly ? targets.filter((t) => t.enabled) : targets
  },

  getTarget(id: string) {
    return load().targets.find((t) => t.id === id) ?? null
  },

  upsertTarget(target: Omit<CrawlTarget, 'created_at' | 'updated_at'> & { created_at?: string }) {
    const data = load()
    const now = new Date().toISOString()
    const idx = data.targets.findIndex((t) => t.id === target.id)
    const record: CrawlTarget = {
      ...target,
      created_at: target.created_at ?? (idx >= 0 ? data.targets[idx].created_at : now),
      updated_at: now,
    }
    if (idx >= 0) data.targets[idx] = record
    else data.targets.push(record)
    save(data)
    return record
  },

  deleteTarget(id: string) {
    const data = load()
    data.targets = data.targets.filter((t) => t.id !== id)
    save(data)
  },

  addSuccess(
    run: CrawlRun,
    items: { pageUrl: string; name: string; value: string }[]
  ) {
    const data = load()
    data.runs.unshift(run)
    for (const item of items) {
      data.items.push({
        run_id: run.id,
        page_url: item.pageUrl,
        field_name: item.name,
        field_value: item.value,
      })
    }
    save(data)
  },

  addFailure(failure: CrawlFailure) {
    const data = load()
    data.failures.unshift(failure)
    save(data)
  },

  getStats() {
    const data = load()
    const total_runs = data.runs.length
    const success_runs = data.runs.filter((r) => r.status === 'success').length
    const total_failures = data.failures.length
    const total_items = data.items.length
    const active_targets = data.targets.filter((t) => t.enabled).length

    const dayMap = new Map<string, { runs: number; successes: number }>()
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

    for (const run of data.runs) {
      const ts = new Date(run.created_at).getTime()
      if (ts < cutoff) continue
      const day = run.created_at.slice(0, 10)
      const entry = dayMap.get(day) ?? { runs: 0, successes: 0 }
      entry.runs++
      if (run.status === 'success') entry.successes++
      dayMap.set(day, entry)
    }

    const last7Days = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, runs: v.runs, successes: v.successes }))

    return {
      totals: { total_runs, success_runs, total_failures, total_items, active_targets },
      last7Days,
    }
  },

  getRuns(limit: number, targetId?: string) {
    let runs = load().runs
    if (targetId) runs = runs.filter((r) => r.target_id === targetId)
    return runs.slice(0, limit)
  },

  getFailures(limit: number) {
    return load().failures.slice(0, limit)
  },

  getItems(runId: string) {
    return load().items.filter((i) => i.run_id === runId)
  },

  listTokens() {
    return load().tokens.map((t) => ({
      id: t.id,
      name: t.name,
      token_prefix: t.token_prefix,
      scopes: t.scopes,
      created_at: t.created_at,
      last_used_at: t.last_used_at,
    }))
  },

  createToken(name: string, scopes: ApiToken['scopes']) {
    const raw = `cst_${randomBytes(24).toString('hex')}`
    const data = load()
    const token: ApiToken = {
      id: randomUUID(),
      name,
      token_hash: hashToken(raw),
      token_prefix: raw.slice(0, 12),
      scopes,
      created_at: new Date().toISOString(),
      last_used_at: null,
    }
    data.tokens.push(token)
    save(data)
    return { token: raw, meta: token }
  },

  revokeToken(id: string) {
    const data = load()
    data.tokens = data.tokens.filter((t) => t.id !== id)
    save(data)
  },

  validateToken(raw: string, requiredScope?: ApiToken['scopes'][number]) {
    const data = load()
    const hash = hashToken(raw)
    const found = data.tokens.find((t) => t.token_hash === hash)
    if (!found) return null
    if (requiredScope && !found.scopes.includes(requiredScope) && !found.scopes.includes('agent')) {
      return null
    }
    found.last_used_at = new Date().toISOString()
    save(data)
    return found
  },
}
