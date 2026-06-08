import { z } from 'zod'

export const crawlFieldSchema = z.object({
  name: z.string().min(1),
  selector: z.string().min(1),
  attribute: z.string().optional(),
  fallbacks: z.array(z.string()).optional(),
})

export const crawlTargetSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  url: z.string().url(),
  enabled: z.boolean().default(true),
  crawl_mode: z.enum(['single', 'follow_links']).default('single'),
  allowed_url_patterns: z.array(z.string()).default([]),
  stop_url_patterns: z.array(z.string()).default([]),
  max_pages: z.number().int().min(1).max(500).default(1),
  max_depth: z.number().int().min(0).max(10).default(0),
  fields: z.array(crawlFieldSchema).min(1),
})

export const crawlSuccessSchema = z.object({
  runId: z.string(),
  targetId: z.string(),
  targetName: z.string(),
  url: z.string().url(),
  durationMs: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      pageUrl: z.string().url(),
      name: z.string(),
      value: z.string(),
    })
  ),
})

export const crawlFailureSchema = z.object({
  failureId: z.string(),
  targetId: z.string(),
  targetName: z.string(),
  url: z.string().url(),
  errorMessage: z.string(),
  selector: z.string().optional(),
  htmlSnippet: z.string().optional(),
})

export const createTokenSchema = z.object({
  name: z.string().min(1),
  scopes: z
    .array(z.enum(['read', 'write', 'crawl', 'agent']))
    .default(['read', 'agent']),
})
