import type { Context } from 'hono'

export type AppEnv = {
  ADMIN_KEY?: string
  API_KEY?: string
  CORS_ORIGIN?: string
  N8N_FAILURE_WEBHOOK?: string
  CRON_SECRET?: string
  OPENAI_API_KEY?: string
}

function nodeEnv(): NodeJS.ProcessEnv | undefined {
  try {
    return typeof process !== 'undefined' ? process.env : undefined
  } catch {
    return undefined
  }
}

export function getEnv(c?: Context): AppEnv {
  const bindings = (c?.env ?? {}) as AppEnv
  const env = nodeEnv()
  return {
    ADMIN_KEY: bindings.ADMIN_KEY ?? env?.ADMIN_KEY,
    API_KEY: bindings.API_KEY ?? env?.API_KEY,
    CORS_ORIGIN: bindings.CORS_ORIGIN ?? env?.CORS_ORIGIN,
    N8N_FAILURE_WEBHOOK: bindings.N8N_FAILURE_WEBHOOK ?? env?.N8N_FAILURE_WEBHOOK,
    CRON_SECRET: bindings.CRON_SECRET ?? env?.CRON_SECRET,
    OPENAI_API_KEY: bindings.OPENAI_API_KEY ?? env?.OPENAI_API_KEY,
  }
}

export function adminKey(env: AppEnv) {
  return env.ADMIN_KEY ?? env.API_KEY
}
