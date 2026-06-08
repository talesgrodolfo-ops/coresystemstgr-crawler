import type { CrawlTarget } from './types.js'

export function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base)
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function matchesPatterns(url: string, patterns: string[]): boolean {
  if (!patterns.length) return true
  return patterns.some((p) => {
    try {
      return new RegExp(p, 'i').test(url)
    } catch {
      return url.includes(p)
    }
  })
}

export function shouldStop(url: string, target: CrawlTarget): boolean {
  if (!target.stop_url_patterns.length) return false
  return matchesPatterns(url, target.stop_url_patterns)
}

export function isAllowed(url: string, target: CrawlTarget, origin: string): boolean {
  if (shouldStop(url, target)) return false
  if (target.allowed_url_patterns.length) {
    return matchesPatterns(url, target.allowed_url_patterns)
  }
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}

export function extractLinks(html: string, pageUrl: string, target: CrawlTarget): string[] {
  const origin = new URL(pageUrl).origin
  const hrefRegex = /href=["']([^"'#]+)["']/gi
  const found = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = hrefRegex.exec(html)) !== null) {
    const normalized = normalizeUrl(match[1], pageUrl)
    if (normalized && isAllowed(normalized, target, origin)) {
      found.add(normalized)
    }
  }
  return [...found]
}
