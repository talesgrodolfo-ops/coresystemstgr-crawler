export type CrawlField = {
  name: string
  selector: string
  attribute?: string
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
  created_at: string
}

export type CrawlItem = {
  run_id: string
  page_url?: string
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
  created_at: string
}

export type ApiTokenMeta = {
  id: string
  name: string
  token_prefix: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
}
