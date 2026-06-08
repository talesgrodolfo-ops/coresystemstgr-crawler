import type { Context, Next } from 'hono'
import { store } from './store.js'

export type AuthMode = 'admin' | 'token' | 'any'

export function requireAuth(mode: AuthMode, scope?: 'read' | 'write' | 'crawl' | 'agent') {
  return async (c: Context, next: Next) => {
    const adminKey = process.env.ADMIN_KEY ?? process.env.API_KEY
    const headerAdmin = c.req.header('x-admin-key')
    const bearer = c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
    const apiKey = c.req.header('x-api-key')

    const isAdmin =
      !!adminKey &&
      (headerAdmin === adminKey || apiKey === adminKey || bearer === adminKey)

    const tokenAuth = bearer?.startsWith('cst_') ? store.validateToken(bearer, scope) : null

    if (mode === 'admin') {
      if (!isAdmin) return c.json({ error: 'Admin key required' }, 401)
      return next()
    }

    if (mode === 'token') {
      if (!tokenAuth) return c.json({ error: 'Valid SDK token required' }, 401)
      c.set('tokenId', tokenAuth.id)
      return next()
    }

    if (!isAdmin && !tokenAuth) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    if (tokenAuth) c.set('tokenId', tokenAuth.id)
    c.set('isAdmin', isAdmin)
    return next()
  }
}
