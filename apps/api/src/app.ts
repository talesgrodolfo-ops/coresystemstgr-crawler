import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { AGENT_DOCS } from './agent-docs.js'
import { checkWorkerKey, requireAuth } from './auth.js'
import { adminKey, getEnv, type AppEnv } from './env.js'
import {
  crawlFailureSchema,
  crawlSuccessSchema,
  crawlTargetSchema,
  createTokenSchema,
} from './schemas.js'
import type { Store } from './store-interface.js'

export type WorkerBindings = AppEnv & { DB: D1Database }

export function createApp(getStore: (c?: { env?: WorkerBindings }) => Store) {
  const app = new Hono<{ Bindings: WorkerBindings }>()

  app.use('*', async (c, next) => {
    const env = getEnv(c)
    const origins = env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173', 'https://monitor.coresystemstgr.com']
    return cors({
      origin: origins,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-admin-key'],
    })(c, next)
  })

  app.get('/api/health', (c) => c.json({ ok: true, service: 'coresystemstgr-crawler-api', runtime: c.env?.DB ? 'cloudflare' : 'node' }))

  app.post('/api/crawls/success', async (c) => {
    if (!checkWorkerKey(c)) return c.json({ error: 'Unauthorized' }, 401)
    const store = getStore(c)
    const body = crawlSuccessSchema.parse(await c.req.json())
    await store.addSuccess({
      id: body.runId,
      target_id: body.targetId,
      target_name: body.targetName,
      url: body.url,
      status: 'success',
      items_count: body.items.length,
      duration_ms: body.durationMs,
      error_message: null,
      created_at: new Date().toISOString(),
    }, body.items)
    return c.json({ ok: true, runId: body.runId })
  })

  app.post('/api/crawls/failure', async (c) => {
    if (!checkWorkerKey(c)) return c.json({ error: 'Unauthorized' }, 401)
    const store = getStore(c)
    const body = crawlFailureSchema.parse(await c.req.json())
    const htmlPath: string | null = null
    await store.addFailure({
      id: body.failureId,
      target_id: body.targetId,
      target_name: body.targetName,
      url: body.url,
      error_message: body.errorMessage,
      selector: body.selector ?? null,
      html_path: htmlPath,
      html_snippet: body.htmlSnippet ?? null,
      created_at: new Date().toISOString(),
    })
    const webhook = getEnv(c).N8N_FAILURE_WEBHOOK
    if (webhook && body.htmlSnippet) {
      void fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'crawler.failure', ...body, htmlPreview: body.htmlSnippet.slice(0, 8000) }),
      }).catch(() => {})
    }
    return c.json({ ok: true, failureId: body.failureId })
  })

  const admin = new Hono<{ Bindings: WorkerBindings }>()
  admin.use('*', (c, next) => requireAuth(getStore(c), 'admin')(c, next))

  admin.get('/stats', async (c) => c.json(await getStore(c).getStats()))
  admin.get('/targets', async (c) => c.json({ targets: await getStore(c).getTargets() }))
  admin.get('/targets/:id', async (c) => {
    const target = await getStore(c).getTarget(c.req.param('id'))
    if (!target) return c.json({ error: 'Not found' }, 404)
    return c.json({ target })
  })
  admin.post('/targets', async (c) => {
    const body = crawlTargetSchema.parse(await c.req.json())
    const target = await getStore(c).upsertTarget({ ...body, id: body.id ?? crypto.randomUUID() })
    return c.json({ target }, 201)
  })
  admin.put('/targets/:id', async (c) => {
    const body = crawlTargetSchema.parse(await c.req.json())
    const target = await getStore(c).upsertTarget({ ...body, id: c.req.param('id') })
    return c.json({ target })
  })
  admin.delete('/targets/:id', async (c) => {
    await getStore(c).deleteTarget(c.req.param('id'))
    return c.json({ ok: true })
  })
  admin.get('/crawls', async (c) => {
    const limit = Number(c.req.query('limit') ?? 50)
    const targetId = c.req.query('targetId') ?? undefined
    return c.json({ runs: await getStore(c).getRuns(limit, targetId) })
  })
  admin.get('/crawls/:runId/items', async (c) => c.json({ items: await getStore(c).getItems(c.req.param('runId')) }))
  admin.get('/failures', async (c) => c.json({ failures: await getStore(c).getFailures(Number(c.req.query('limit') ?? 50)) }))
  admin.get('/tokens', async (c) => c.json({ tokens: await getStore(c).listTokens() }))
  admin.post('/tokens', async (c) => {
    const body = createTokenSchema.parse(await c.req.json())
    const created = await getStore(c).createToken(body.name, body.scopes)
    return c.json({
      token: created.token,
      meta: { id: created.meta.id, name: created.meta.name, token_prefix: created.meta.token_prefix, scopes: created.meta.scopes, created_at: created.meta.created_at },
      warning: 'Guarde este token agora. Ele não será exibido novamente.',
    }, 201)
  })
  admin.delete('/tokens/:id', async (c) => {
    await getStore(c).revokeToken(c.req.param('id'))
    return c.json({ ok: true })
  })
  admin.get('/agent-docs', (c) => c.json(AGENT_DOCS))

  app.route('/api/admin', admin)

  const agent = new Hono<{ Bindings: WorkerBindings }>()
  agent.use('*', (c, next) => requireAuth(getStore(c), 'token', 'read')(c, next))
  agent.get('/docs', (c) => c.json(AGENT_DOCS))
  agent.get('/targets', async (c) => c.json({ targets: await getStore(c).getTargets() }))
  agent.get('/targets/:id', async (c) => {
    const target = await getStore(c).getTarget(c.req.param('id'))
    if (!target) return c.json({ error: 'Not found' }, 404)
    return c.json({ target })
  })
  agent.post('/targets', (c, next) => requireAuth(getStore(c), 'token', 'write')(c, next), async (c) => {
    const body = crawlTargetSchema.parse(await c.req.json())
    return c.json({ target: await getStore(c).upsertTarget({ ...body, id: body.id ?? crypto.randomUUID() }) }, 201)
  })
  agent.put('/targets/:id', (c, next) => requireAuth(getStore(c), 'token', 'write')(c, next), async (c) => {
    const body = crawlTargetSchema.parse(await c.req.json())
    return c.json({ target: await getStore(c).upsertTarget({ ...body, id: c.req.param('id') }) })
  })
  agent.post('/crawl/:id', (c, next) => requireAuth(getStore(c), 'token', 'crawl')(c, next), async (c) => {
    const target = await getStore(c).getTarget(c.req.param('id'))
    if (!target) return c.json({ error: 'Target not found' }, 404)
    return c.json({ ok: true, message: 'Dispare o cron do Worker ou N8N para executar.', targetId: target.id })
  })
  agent.get('/runs', async (c) => c.json({ runs: await getStore(c).getRuns(Number(c.req.query('limit') ?? 20), c.req.query('targetId') ?? undefined) }))
  agent.get('/runs/:runId/items', async (c) => c.json({ items: await getStore(c).getItems(c.req.param('runId')) }))
  agent.get('/failures', async (c) => c.json({ failures: await getStore(c).getFailures(Number(c.req.query('limit') ?? 20)) }))

  app.route('/api/agent', agent)

  app.get('/api/worker/targets', async (c) => {
    if (!checkWorkerKey(c)) return c.json({ error: 'Unauthorized' }, 401)
    const store = getStore(c)
    const id = c.req.query('id')
    if (id) {
      const target = await store.getTarget(id)
      if (!target?.enabled) return c.json({ error: 'Not found' }, 404)
      return c.json({ targets: [target] })
    }
    return c.json({ targets: await store.getTargets(true) })
  })

  return app
}
