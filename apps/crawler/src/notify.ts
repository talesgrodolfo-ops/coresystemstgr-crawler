type SuccessPayload = {
  runId: string
  targetId: string
  targetName: string
  url: string
  durationMs: number
  items: { pageUrl: string; name: string; value: string }[]
}

type FailurePayload = {
  failureId: string
  targetId: string
  targetName: string
  url: string
  errorMessage: string
  selector?: string
  htmlSnippet?: string
}

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  const key = process.env.ADMIN_KEY ?? process.env.API_KEY
  if (key) h['x-api-key'] = key
  return h
}

export async function notifyApiSuccess(payload: SuccessPayload) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${apiUrl}/api/crawls/success`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`API success falhou: ${res.status}`)
}

export async function notifyApiFailure(payload: FailurePayload) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${apiUrl}/api/crawls/failure`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`API failure falhou: ${res.status}`)
}

export async function notifyN8nFailure(payload: FailurePayload & { html: string }) {
  const webhook = process.env.N8N_FAILURE_WEBHOOK
  if (!webhook) return

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'crawler.failure',
      timestamp: new Date().toISOString(),
      ...payload,
      htmlPreview: payload.html.slice(0, 8000),
      promptSuggestion: [
        `O crawler "${payload.targetName}" falhou.`,
        `Erro: ${payload.errorMessage}`,
        `URL: ${payload.url}`,
        `Use PUT /api/agent/targets/${payload.targetId} com novo seletor.`,
      ].join('\n'),
    }),
  })
}
