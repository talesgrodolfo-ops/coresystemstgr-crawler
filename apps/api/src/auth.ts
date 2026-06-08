import type { Context, Next } from 'hono'
import type { Store } from './store-interface.js'
import { adminKey, getEnv } from './env.js'

export type AuthMode = 'admin' | 'token' | 'any'

export function requireAuth(store: Store, mode: AuthMode, scope?: 'read' | 'write' | 'crawl' | 'agent') {
  return async (c: Context, next: Next) => {
    const env = getEnv(c)
    const key = adminKey(env)
    const headerAdmin = c.req.header('x-admin-key')
    const bearer = c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
    const apiKey = c.req.header('x-api-key')

    const isAdmin = !!key && (headerAdmin === key || apiKey === key || bearer === key)
    const tokenAuth = bearer?.startsWith('cst_') ? await store.validateToken(bearer, scope) : null

    if (mode === 'admin') {
      if (!isAdmin) return c.json({ error: 'Admin key required' }, 401)
      return next()
    }

    if (mode === 'token') {
      if (!tokenAuth) return c.json({ error: 'Valid SDK token required' }, 401)
      return next()
    }

    if (!isAdmin && !tokenAuth) return c.json({ error: 'Unauthorized' }, 401)
    return next()
  }
}

export function checkWorkerKey(c: Context): boolean {
  const env = getEnv(c)
  const key = adminKey(env)
  const header = c.req.header('x-api-key') ?? c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
  return !key || header === key
}
