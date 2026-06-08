export type CrawlField = {
  name: string
  selector: string
  attribute?: 'text' | 'html' | string
  fallbacks?: string[]
}

export type CrawlTarget = {
  id: string
  name: string
  url: string
  enabled: boolean
  crawl_mode: 'single' | 'follow_links'
  allowed_url_patterns: string[]
  stop_url_patterns: string[]
  max_pages: number
  max_depth: number
  fields: CrawlField[]
}

export type ExtractedItem = {
  pageUrl: string
  name: string
  value: string
}
