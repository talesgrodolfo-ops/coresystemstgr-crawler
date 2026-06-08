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
  created_at: string
  updated_at: string
}

export type CrawlRun = {
  id: string
  target_id: string
  target_name: string
  url: string
  status: string
  items_count: number
  duration_ms: number | null
  error_message: string | null
  created_at: string
}

export type CrawlItem = {
  run_id: string
  page_url: string
  field_name: string
  field_value: string
}

export type CrawlFailure = {
  id: string
  target_id: string
  target_name: string
  url: string
  error_message: string
  selector: string | null
  html_path: string | null
  created_at: string
}

export type ApiToken = {
  id: string
  name: string
  token_hash: string
  token_prefix: string
  scopes: ('read' | 'write' | 'crawl' | 'agent')[]
  created_at: string
  last_used_at: string | null
}

export type StoreData = {
  targets: CrawlTarget[]
  runs: CrawlRun[]
  items: CrawlItem[]
  failures: CrawlFailure[]
  tokens: ApiToken[]
}
