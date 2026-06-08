import type { Context } from 'hono'

export type AppEnv = {
  ADMIN_KEY?: string
  API_KEY?: string
  CORS_ORIGIN?: string
  N8N_FAILURE_WEBHOOK?: string
  CRON_SECRET?: string
}

export function getEnv(c?: Context): AppEnv {
  const bindings = (c?.env ?? {}) as AppEnv
  return {
    ADMIN_KEY: bindings.ADMIN_KEY ?? process.env.ADMIN_KEY,
    API_KEY: bindings.API_KEY ?? process.env.API_KEY,
    CORS_ORIGIN: bindings.CORS_ORIGIN ?? process.env.CORS_ORIGIN,
    N8N_FAILURE_WEBHOOK: bindings.N8N_FAILURE_WEBHOOK ?? process.env.N8N_FAILURE_WEBHOOK,
    CRON_SECRET: bindings.CRON_SECRET ?? process.env.CRON_SECRET,
  }
}

export function adminKey(env: AppEnv) {
  return env.ADMIN_KEY ?? env.API_KEY
}
