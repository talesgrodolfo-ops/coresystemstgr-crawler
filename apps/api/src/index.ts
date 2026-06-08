import { serve } from '@hono/node-server'
import { config } from 'dotenv'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { AGENT_DOCS } from './agent-docs.js'
import { requireAuth } from './auth.js'
import {
  crawlFailureSchema,
  crawlSuccessSchema,
  crawlTargetSchema,
  createTokenSchema,
} from './schemas.js'
import { store } from './store.js'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(rootDir, '.env') })

const artifactsDir = resolve(rootDir, 'data', 'artifacts')
mkdirSync(artifactsDir, { recursive: true })

const app = new Hono()

app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-admin-key'],
  })
)

app.get('/api/health', (c) => c.json({ ok: true, service: 'coresystemstgr-crawler-api' }))

// ── Public ingest (crawler worker) ──────────────────────────────────────────
app.post('/api/crawls/success', async (c) => {
  const adminKey = process.env.ADMIN_KEY ?? process.env.API_KEY
  const key = c.req.header('x-api-key') ?? c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (adminKey && key !== adminKey) return c.json({ error: 'Unauthorized' }, 401)

  const body = crawlSuccessSchema.parse(await c.req.json())
  store.addSuccess(
    {
      id: body.runId,
      target_id: body.targetId,
      target_name: body.targetName,
      url: body.url,
      status: 'success',
      items_count: body.items.length,
      duration_ms: body.durationMs,
      error_message: null,
      created_at: new Date().toISOString(),
    },
    body.items
  )
  return c.json({ ok: true, runId: body.runId })
})

app.post('/api/crawls/failure', async (c) => {
  const adminKey = process.env.ADMIN_KEY ?? process.env.API_KEY
  const key = c.req.header('x-api-key') ?? c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (adminKey && key !== adminKey) return c.json({ error: 'Unauthorized' }, 401)

  const body = crawlFailureSchema.parse(await c.req.json())
  let htmlPath: string | null = null
  if (body.htmlSnippet) {
    htmlPath = resolve(artifactsDir, `${body.failureId}.html`)
    writeFileSync(htmlPath, body.htmlSnippet, 'utf-8')
  }
  store.addFailure({
    id: body.failureId,
    target_id: body.targetId,
    target_name: body.targetName,
    url: body.url,
    error_message: body.errorMessage,
    selector: body.selector ?? null,
    html_path: htmlPath,
    created_at: new Date().toISOString(),
  })
  return c.json({ ok: true, failureId: body.failureId })
})

// ── Admin UI API ────────────────────────────────────────────────────────────
const admin = new Hono()
admin.use('*', requireAuth('admin'))

admin.get('/stats', (c) => c.json(store.getStats()))
admin.get('/targets', (c) => c.json({ targets: store.getTargets() }))
admin.get('/targets/:id', (c) => {
  const target = store.getTarget(c.req.param('id'))
  if (!target) return c.json({ error: 'Not found' }, 404)
  return c.json({ target })
})
admin.post('/targets', async (c) => {
  const body = crawlTargetSchema.parse(await c.req.json())
  const id = body.id ?? randomUUID()
  const target = store.upsertTarget({ ...body, id })
  return c.json({ target }, 201)
})
admin.put('/targets/:id', async (c) => {
  const body = crawlTargetSchema.parse(await c.req.json())
  const target = store.upsertTarget({ ...body, id: c.req.param('id') })
  return c.json({ target })
})
admin.delete('/targets/:id', (c) => {
  store.deleteTarget(c.req.param('id'))
  return c.json({ ok: true })
})
admin.get('/crawls', (c) => {
  const limit = Number(c.req.query('limit') ?? 50)
  const targetId = c.req.query('targetId')
  return c.json({ runs: store.getRuns(limit, targetId) })
})
admin.get('/crawls/:runId/items', (c) => {
  const items = store.getItems(c.req.param('runId'))
  return c.json({ items })
})
admin.get('/failures', (c) => {
  const limit = Number(c.req.query('limit') ?? 50)
  return c.json({ failures: store.getFailures(limit) })
})
admin.get('/tokens', (c) => c.json({ tokens: store.listTokens() }))
admin.post('/tokens', async (c) => {
  const body = createTokenSchema.parse(await c.req.json())
  const created = store.createToken(body.name, body.scopes)
  return c.json({
    token: created.token,
    meta: {
      id: created.meta.id,
      name: created.meta.name,
      token_prefix: created.meta.token_prefix,
      scopes: created.meta.scopes,
      created_at: created.meta.created_at,
    },
    warning: 'Guarde este token agora. Ele não será exibido novamente.',
  }, 201)
})
admin.delete('/tokens/:id', (c) => {
  store.revokeToken(c.req.param('id'))
  return c.json({ ok: true })
})
admin.get('/agent-docs', (c) => c.json(AGENT_DOCS))

app.route('/api/admin', admin)

// ── Agent / SDK API (Cursor) ────────────────────────────────────────────────
const agent = new Hono()
agent.use('*', requireAuth('token', 'read'))

agent.get('/docs', (c) => c.json(AGENT_DOCS))
agent.get('/targets', (c) => c.json({ targets: store.getTargets() }))
agent.get('/targets/:id', (c) => {
  const target = store.getTarget(c.req.param('id'))
  if (!target) return c.json({ error: 'Not found' }, 404)
  return c.json({ target })
})

agent.post('/targets', requireAuth('token', 'write'), async (c) => {
  const body = crawlTargetSchema.parse(await c.req.json())
  const id = body.id ?? randomUUID()
  return c.json({ target: store.upsertTarget({ ...body, id }) }, 201)
})

agent.put('/targets/:id', requireAuth('token', 'write'), async (c) => {
  const body = crawlTargetSchema.parse(await c.req.json())
  return c.json({ target: store.upsertTarget({ ...body, id: c.req.param('id') }) })
})

agent.post('/crawl/:id', requireAuth('token', 'crawl'), (c) => {
  const target = store.getTarget(c.req.param('id'))
  if (!target) return c.json({ error: 'Target not found' }, 404)
  return c.json({
    ok: true,
    message: 'Crawl enfileirado. Execute: pnpm crawl -- --target=' + target.id,
    targetId: target.id,
    command: `pnpm crawl -- --target=${target.id}`,
  })
})

agent.get('/runs', (c) => {
  const limit = Number(c.req.query('limit') ?? 20)
  const targetId = c.req.query('targetId')
  return c.json({ runs: store.getRuns(limit, targetId) })
})

agent.get('/runs/:runId/items', (c) => c.json({ items: store.getItems(c.req.param('runId')) }))
agent.get('/failures', (c) => c.json({ failures: store.getFailures(Number(c.req.query('limit') ?? 20)) }))

app.route('/api/agent', agent)

// Crawler worker reads targets
app.get('/api/worker/targets', (c) => {
  const adminKey = process.env.ADMIN_KEY ?? process.env.API_KEY
  const key = c.req.header('x-api-key')
  if (adminKey && key !== adminKey) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.query('id')
  if (id) {
    const target = store.getTarget(id)
    if (!target?.enabled) return c.json({ error: 'Not found' }, 404)
    return c.json({ targets: [target] })
  }
  return c.json({ targets: store.getTargets(true) })
})

const port = Number(process.env.PORT ?? 4000)
console.log(`API rodando em http://localhost:${port}`)
serve({ fetch: app.fetch, port })
