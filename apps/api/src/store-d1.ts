import type { Store } from './store-interface.js'
import type { ApiToken, CrawlRun, CrawlTarget } from './types.js'

function hashToken(token: string) {
  const data = new TextEncoder().encode(token)
  return crypto.subtle.digest('SHA-256', data).then((buf) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  )
}

function rowToTarget(row: Record<string, unknown>): CrawlTarget {
  return {
    id: String(row.id),
    name: String(row.name),
    url: String(row.url),
    enabled: Boolean(row.enabled),
    crawl_mode: row.crawl_mode as CrawlTarget['crawl_mode'],
    allowed_url_patterns: JSON.parse(String(row.allowed_url_patterns || '[]')),
    stop_url_patterns: JSON.parse(String(row.stop_url_patterns || '[]')),
    max_pages: Number(row.max_pages),
    max_depth: Number(row.max_depth),
    fields: JSON.parse(String(row.fields)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export function createD1Store(db: D1Database): Store {
  return {
    async getTargets(enabledOnly = false) {
      const q = enabledOnly
        ? 'SELECT * FROM targets WHERE enabled = 1 ORDER BY updated_at DESC'
        : 'SELECT * FROM targets ORDER BY updated_at DESC'
      const { results } = await db.prepare(q).all()
      return (results ?? []).map((r) => rowToTarget(r as Record<string, unknown>))
    },
    async getTarget(id) {
      const row = await db.prepare('SELECT * FROM targets WHERE id = ?').bind(id).first()
      return row ? rowToTarget(row as Record<string, unknown>) : null
    },
    async upsertTarget(target) {
      const now = new Date().toISOString()
      const existing = await this.getTarget(target.id)
      const record: CrawlTarget = {
        ...target,
        created_at: target.created_at ?? existing?.created_at ?? now,
        updated_at: now,
      }
      await db.prepare(
        `INSERT INTO targets (id,name,url,enabled,crawl_mode,allowed_url_patterns,stop_url_patterns,max_pages,max_depth,fields,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, url=excluded.url, enabled=excluded.enabled, crawl_mode=excluded.crawl_mode,
           allowed_url_patterns=excluded.allowed_url_patterns, stop_url_patterns=excluded.stop_url_patterns,
           max_pages=excluded.max_pages, max_depth=excluded.max_depth, fields=excluded.fields, updated_at=excluded.updated_at`
      ).bind(
        record.id, record.name, record.url, record.enabled ? 1 : 0, record.crawl_mode,
        JSON.stringify(record.allowed_url_patterns), JSON.stringify(record.stop_url_patterns),
        record.max_pages, record.max_depth, JSON.stringify(record.fields),
        record.created_at, record.updated_at
      ).run()
      return record
    },
    async deleteTarget(id) {
      await db.prepare('DELETE FROM targets WHERE id = ?').bind(id).run()
    },
    async addSuccess(run, items) {
      await db.prepare(
        `INSERT INTO crawl_runs (id,target_id,target_name,url,status,items_count,duration_ms,error_message,created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).bind(run.id, run.target_id, run.target_name, run.url, run.status, run.items_count, run.duration_ms, run.error_message, run.created_at).run()
      const stmt = db.prepare('INSERT INTO crawl_items (run_id,page_url,field_name,field_value) VALUES (?,?,?,?)')
      for (const item of items) {
        await stmt.bind(run.id, item.pageUrl, item.name, item.value).run()
      }
    },
    async addFailure(failure) {
      await db.prepare(
        `INSERT INTO crawl_failures (id,target_id,target_name,url,error_message,selector,html_snippet,created_at)
         VALUES (?,?,?,?,?,?,?,?)`
      ).bind(
        failure.id, failure.target_id, failure.target_name, failure.url,
        failure.error_message, failure.selector, failure.html_snippet ?? failure.html_path, failure.created_at
      ).run()
    },
    async getStats() {
      const totals = await db.prepare(
        `SELECT
          (SELECT COUNT(*) FROM crawl_runs) as total_runs,
          (SELECT COUNT(*) FROM crawl_runs WHERE status='success') as success_runs,
          (SELECT COUNT(*) FROM crawl_failures) as total_failures,
          (SELECT COUNT(*) FROM crawl_items) as total_items,
          (SELECT COUNT(*) FROM targets WHERE enabled=1) as active_targets`
      ).first()
      const { results } = await db.prepare(
        `SELECT date(created_at) as day, COUNT(*) as runs,
          SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as successes
         FROM crawl_runs WHERE created_at >= datetime('now','-7 days')
         GROUP BY date(created_at) ORDER BY day ASC`
      ).all()
      const t = totals as Record<string, number>
      return {
        totals: {
          total_runs: Number(t.total_runs ?? 0),
          success_runs: Number(t.success_runs ?? 0),
          total_failures: Number(t.total_failures ?? 0),
          total_items: Number(t.total_items ?? 0),
          active_targets: Number(t.active_targets ?? 0),
        },
        last7Days: (results ?? []).map((r) => ({
          day: String((r as Record<string, unknown>).day),
          runs: Number((r as Record<string, unknown>).runs),
          successes: Number((r as Record<string, unknown>).successes),
        })),
      }
    },
    async getRuns(limit, targetId) {
      const q = targetId
        ? 'SELECT * FROM crawl_runs WHERE target_id = ? ORDER BY created_at DESC LIMIT ?'
        : 'SELECT * FROM crawl_runs ORDER BY created_at DESC LIMIT ?'
      const stmt = db.prepare(q)
      const { results } = targetId
        ? await stmt.bind(targetId, limit).all()
        : await stmt.bind(limit).all()
      return (results ?? []) as CrawlRun[]
    },
    async getFailures(limit) {
      const { results } = await db.prepare(
        'SELECT id,target_id,target_name,url,error_message,selector,html_snippet,created_at FROM crawl_failures ORDER BY created_at DESC LIMIT ?'
      ).bind(limit).all()
      return (results ?? []).map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          target_id: String(row.target_id),
          target_name: String(row.target_name),
          url: String(row.url),
          error_message: String(row.error_message),
          selector: row.selector ? String(row.selector) : null,
          html_path: null,
          html_snippet: row.html_snippet ? String(row.html_snippet) : null,
          created_at: String(row.created_at),
        }
      })
    },
    async getItems(runId) {
      const { results } = await db.prepare(
        'SELECT run_id,page_url,field_name,field_value FROM crawl_items WHERE run_id = ? ORDER BY id ASC'
      ).bind(runId).all()
      return (results ?? []).map((r) => {
        const row = r as Record<string, unknown>
        return {
          run_id: String(row.run_id),
          page_url: String(row.page_url),
          field_name: String(row.field_name),
          field_value: String(row.field_value),
        }
      })
    },
    async listTokens() {
      const { results } = await db.prepare('SELECT id,name,token_prefix,scopes,created_at,last_used_at FROM api_tokens ORDER BY created_at DESC').all()
      return (results ?? []).map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          name: String(row.name),
          token_prefix: String(row.token_prefix),
          scopes: JSON.parse(String(row.scopes)) as ApiToken['scopes'],
          created_at: String(row.created_at),
          last_used_at: row.last_used_at ? String(row.last_used_at) : null,
        }
      })
    },
    async createToken(name, scopes) {
      const raw = `cst_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
      const tokenHash = await hashToken(raw)
      const meta: ApiToken = {
        id: crypto.randomUUID(),
        name,
        token_hash: tokenHash,
        token_prefix: raw.slice(0, 12),
        scopes,
        created_at: new Date().toISOString(),
        last_used_at: null,
      }
      await db.prepare(
        'INSERT INTO api_tokens (id,name,token_hash,token_prefix,scopes,created_at,last_used_at) VALUES (?,?,?,?,?,?,?)'
      ).bind(meta.id, meta.name, meta.token_hash, meta.token_prefix, JSON.stringify(scopes), meta.created_at, null).run()
      return { token: raw, meta }
    },
    async revokeToken(id) {
      await db.prepare('DELETE FROM api_tokens WHERE id = ?').bind(id).run()
    },
    async validateToken(raw, requiredScope) {
      const tokenHash = await hashToken(raw)
      const row = await db.prepare('SELECT * FROM api_tokens WHERE token_hash = ?').bind(tokenHash).first()
      if (!row) return null
      const found = row as Record<string, unknown>
      const scopes = JSON.parse(String(found.scopes)) as ApiToken['scopes']
      if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes('agent')) return null
      await db.prepare('UPDATE api_tokens SET last_used_at = ? WHERE id = ?').bind(new Date().toISOString(), found.id).run()
      return {
        id: String(found.id),
        name: String(found.name),
        token_hash: String(found.token_hash),
        token_prefix: String(found.token_prefix),
        scopes,
        created_at: String(found.created_at),
        last_used_at: new Date().toISOString(),
      }
    },
  }
}
