CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  crawl_mode TEXT NOT NULL DEFAULT 'single',
  allowed_url_patterns TEXT NOT NULL DEFAULT '[]',
  stop_url_patterns TEXT NOT NULL DEFAULT '[]',
  max_pages INTEGER NOT NULL DEFAULT 1,
  max_depth INTEGER NOT NULL DEFAULT 0,
  fields TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  items_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_failures (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  url TEXT NOT NULL,
  error_message TEXT NOT NULL,
  selector TEXT,
  html_snippet TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  scopes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
