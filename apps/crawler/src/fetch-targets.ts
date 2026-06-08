import type { CrawlTarget } from './types.js'

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  const key = process.env.ADMIN_KEY ?? process.env.API_KEY
  if (key) h['x-api-key'] = key
  return h
}

export async function fetchTargets(targetId?: string): Promise<CrawlTarget[]> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000'
  const qs = targetId ? `?id=${encodeURIComponent(targetId)}` : ''
  const res = await fetch(`${apiUrl}/api/worker/targets${qs}`, { headers: headers() })
  if (!res.ok) throw new Error(`Falha ao buscar targets: ${res.status}`)
  const data = (await res.json()) as { targets: CrawlTarget[] }
  return data.targets
}
