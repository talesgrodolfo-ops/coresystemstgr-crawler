import { z } from 'zod'
import type { Store } from './store-interface.js'
import type { AppEnv } from './env.js'

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }))
    .max(12)
    .optional(),
})

const SYSTEM = `Você é o assistente do CoreSystemsTGR Crawler Hub.
Ajude o cliente a entender falhas de crawler, sugerir seletores CSS e próximos passos.
Use APENAS o contexto JSON fornecido. Se faltar informação, diga o que precisa.
Responda em português, de forma clara e objetiva.
Quando sugerir seletor, informe o nome do campo e o seletor CSS exato.
Não invente URLs ou targets que não estejam no contexto.`

export async function buildChatContext(store: Store) {
  const [targets, failures, runs] = await Promise.all([
    store.getTargets(),
    store.getFailures(8),
    store.getRuns(10),
  ])

  return {
    targets: targets.map((t) => ({
      id: t.id,
      name: t.name,
      url: t.url,
      enabled: t.enabled,
      crawl_mode: t.crawl_mode,
      fields: t.fields.map((f) => ({ name: f.name, selector: f.selector, fallbacks: f.fallbacks ?? [] })),
    })),
    recent_failures: failures.map((f) => ({
      id: f.id,
      target_id: f.target_id,
      target_name: f.target_name,
      url: f.url,
      error_message: f.error_message,
      selector: f.selector,
      created_at: f.created_at,
      html_preview: f.html_snippet?.slice(0, 2500) ?? null,
    })),
    recent_runs: runs.map((r) => ({
      target_name: r.target_name,
      status: r.status,
      items_count: r.items_count,
      duration_ms: r.duration_ms,
      created_at: r.created_at,
    })),
  }
}

async function callOpenAI(apiKey: string, userMessage: string, history: { role: string; content: string }[], context: unknown) {
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'system', content: `Contexto atual:\n${JSON.stringify(context, null, 2)}` },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 1200,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI erro ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content?.trim() ?? 'Sem resposta do modelo.'
}

function fallbackReply(message: string, context: Awaited<ReturnType<typeof buildChatContext>>) {
  const lower = message.toLowerCase()
  const last = context.recent_failures[0]

  if (!context.recent_failures.length) {
    return 'Não há falhas recentes no sistema. Cadastre um target em **Targets**, rode o crawler e volte aqui se algo quebrar.'
  }

  if (lower.includes('falh') || lower.includes('erro') || lower.includes('últim') || lower.includes('ultim')) {
    if (!last) return 'Nenhuma falha encontrada.'
    return [
      `**Última falha:** ${last.target_name}`,
      `**URL:** ${last.url}`,
      `**Erro:** ${last.error_message}`,
      last.selector ? `**Seletor:** \`${last.selector}\`` : '',
      '',
      'Sugestão: abra **Targets**, edite os seletores/fallbacks deste target e rode `pnpm crawl` de novo.',
      'Configure `OPENAI_API_KEY` no Worker para análise automática do HTML.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (lower.includes('target') || lower.includes('crawler')) {
    const list = context.targets.map((t) => `- **${t.name}** (\`${t.id}\`) — ${t.url}`).join('\n')
    return `**Targets cadastrados:**\n${list || 'Nenhum.'}`
  }

  return [
    `Tenho contexto de **${context.recent_failures.length}** falha(s) e **${context.targets.length}** target(s).`,
    'Pergunte por exemplo: "qual foi o último erro?" ou "o que fazer no target X?"',
    '',
    last ? `Última falha: **${last.target_name}** — ${last.error_message}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function handleChat(store: Store, env: AppEnv, body: z.infer<typeof chatRequestSchema>) {
  const context = await buildChatContext(store)
  const history = body.history ?? []
  const openaiKey = (env as AppEnv & { OPENAI_API_KEY?: string }).OPENAI_API_KEY

  let reply: string
  let mode: 'openai' | 'fallback' = 'fallback'

  if (openaiKey) {
    try {
      reply = await callOpenAI(openaiKey, body.message, history, context)
      mode = 'openai'
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      reply = `${fallbackReply(body.message, context)}\n\n_(IA indisponível: ${msg})_`
    }
  } else {
    reply = fallbackReply(body.message, context)
  }

  return { reply, mode, context_summary: { failures: context.recent_failures.length, targets: context.targets.length } }
}
