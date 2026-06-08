import * as cheerio from 'cheerio'
import type { CrawlField, ExtractedItem } from './types.js'

export function extractField($: cheerio.CheerioAPI, field: CrawlField): string {
  const selectors = [field.selector, ...(field.fallbacks ?? [])]

  for (const selector of selectors) {
    const el = $(selector).first()
    if (!el.length) continue

    if (!field.attribute || field.attribute === 'text') {
      const value = el.text().trim()
      if (value) return value
    } else if (field.attribute === 'html') {
      const value = el.html()?.trim()
      if (value) return value
    } else {
      const value = el.attr(field.attribute)?.trim()
      if (value) return value
    }
  }

  throw new Error(`Nenhum seletor encontrou valor para "${field.name}"`)
}

export function extractAll(
  $: cheerio.CheerioAPI,
  fields: CrawlField[]
): { name: string; value: string }[] {
  return fields.map((field) => ({
    name: field.name,
    value: extractField($, field),
  }))
}

/** Extrai o que encontrar; ignora campos ausentes (útil em follow_links). */
export function extractAllSafe(
  $: cheerio.CheerioAPI,
  fields: CrawlField[]
): { name: string; value: string }[] {
  const rows: { name: string; value: string }[] = []
  for (const field of fields) {
    try {
      rows.push({ name: field.name, value: extractField($, field) })
    } catch {
      // campo ausente nesta página — segue
    }
  }
  return rows
}
