import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import { extractAll } from './extract.js'
import { fetchTargets } from './fetch-targets.js'
import { notifyApiFailure, notifyApiSuccess, notifyN8nFailure } from './notify.js'
import type { CrawlTarget, ExtractedItem } from './types.js'
import { extractLinks, shouldStop } from './urls.js'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(rootDir, '.env') })

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CoreSystemsTGR-Crawler/1.0',
      Accept: 'text/html',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`)
  return res.text()
}

function collectPages(target: CrawlTarget): string[] {
  if (target.crawl_mode === 'single') return [target.url]
  return []
}

async function crawlFollowLinks(target: CrawlTarget): Promise<{ pages: string[]; items: ExtractedItem[] }> {
  const queue: { url: string; depth: number }[] = [{ url: target.url, depth: 0 }]
  const visited = new Set<string>()
  const pages: string[] = []
  const items: ExtractedItem[] = []

  while (queue.length && pages.length < target.max_pages) {
    const current = queue.shift()!
    if (visited.has(current.url) || shouldStop(current.url, target)) continue
    visited.add(current.url)

    const html = await fetchHtml(current.url)
    pages.push(current.url)

    const $ = cheerio.load(html)
    try {
      const extracted = extractAll($, target.fields)
      for (const row of extracted) {
        items.push({ pageUrl: current.url, name: row.name, value: row.value })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`${message} (página: ${current.url})`)
    }

    if (current.depth < target.max_depth) {
      for (const link of extractLinks(html, current.url, target)) {
        if (!visited.has(link)) queue.push({ url: link, depth: current.depth + 1 })
      }
    }
  }

  return { pages, items }
}

async function crawlTarget(target: CrawlTarget) {
  const started = Date.now()
  console.log(`\n→ ${target.name} [${target.crawl_mode}] ${target.url}`)

  try {
    let items: ExtractedItem[] = []
    let pagesVisited = collectPages(target)

    if (target.crawl_mode === 'follow_links') {
      const result = await crawlFollowLinks(target)
      pagesVisited = result.pages
      items = result.items
    } else {
      const html = await fetchHtml(target.url)
      const $ = cheerio.load(html)
      items = extractAll($, target.fields).map((row) => ({
        pageUrl: target.url,
        name: row.name,
        value: row.value,
      }))
    }

    await notifyApiSuccess({
      runId: randomUUID(),
      targetId: target.id,
      targetName: target.name,
      url: target.url,
      durationMs: Date.now() - started,
      items,
    })

    console.log(`  ✓ ${items.length} campos em ${pagesVisited.length} página(s)`)
    for (const item of items.slice(0, 5)) {
      console.log(`    [${item.name}] ${item.value.slice(0, 60)}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const failureId = randomUUID()
    let html = ''
    try {
      html = await fetchHtml(target.url)
    } catch {
      html = ''
    }

    const payload = {
      failureId,
      targetId: target.id,
      targetName: target.name,
      url: target.url,
      errorMessage: message,
      selector: target.fields[0]?.selector,
      htmlSnippet: html.slice(0, 50000),
    }

    await notifyApiFailure(payload)
    await notifyN8nFailure({ ...payload, html })
    console.error(`  ✗ ${message}`)
  }
}

async function main() {
  const argTarget = process.argv.find((a) => a.startsWith('--target='))?.split('=')[1]
  const targets = await fetchTargets(argTarget)

  if (!targets.length) {
    console.error('Nenhum target ativo. Configure em http://localhost:5173/targets')
    process.exit(1)
  }

  console.log(`CoreSystemsTGR Crawler — ${targets.length} target(s)`)
  for (const target of targets) await crawlTarget(target)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
