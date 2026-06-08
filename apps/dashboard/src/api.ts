import type { ApiTokenMeta, CrawlFailure, CrawlItem, CrawlRun, CrawlTarget } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export function getAdminKey() {
  return localStorage.getItem('cst_admin_key') ?? import.meta.env.VITE_ADMIN_KEY ?? ''
}

export function setAdminKey(key: string) {
  localStorage.setItem('cst_admin_key', key)
}

function headers(): HeadersInit {
  const key = getAdminKey()
  return {
    'Content-Type': 'application/json',
    ...(key ? { 'x-admin-key': key } : {}),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers(), ...init?.headers } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Erro ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  stats: () => request<{ totals: Record<string, number>; last7Days: unknown[] }>('/api/admin/stats'),
  targets: () => request<{ targets: CrawlTarget[] }>('/api/admin/targets'),
  getTarget: (id: string) => request<{ target: CrawlTarget }>(`/api/admin/targets/${id}`),
  saveTarget: (target: Partial<CrawlTarget> & { name: string; url: string; fields: CrawlTarget['fields'] }) =>
    request<{ target: CrawlTarget }>(
      target.id ? `/api/admin/targets/${target.id}` : '/api/admin/targets',
      { method: target.id ? 'PUT' : 'POST', body: JSON.stringify(target) }
    ),
  deleteTarget: (id: string) => request<{ ok: boolean }>(`/api/admin/targets/${id}`, { method: 'DELETE' }),
  crawls: (targetId?: string) =>
    request<{ runs: CrawlRun[] }>(`/api/admin/crawls?limit=50${targetId ? `&targetId=${targetId}` : ''}`),
  items: (runId: string) => request<{ items: CrawlItem[] }>(`/api/admin/crawls/${runId}/items`),
  failures: () => request<{ failures: CrawlFailure[] }>('/api/admin/failures?limit=50'),
  tokens: () => request<{ tokens: ApiTokenMeta[] }>('/api/admin/tokens'),
  createToken: (name: string, scopes: string[]) =>
    request<{ token: string; meta: ApiTokenMeta; warning: string }>('/api/admin/tokens', {
      method: 'POST',
      body: JSON.stringify({ name, scopes }),
    }),
  revokeToken: (id: string) => request<{ ok: boolean }>(`/api/admin/tokens/${id}`, { method: 'DELETE' }),
  agentDocs: () => request<Record<string, unknown>>('/api/admin/agent-docs'),
}
