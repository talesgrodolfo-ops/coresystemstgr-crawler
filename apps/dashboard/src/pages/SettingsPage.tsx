import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ApiTokenMeta } from '../types'

export default function SettingsPage() {
  const [tokens, setTokens] = useState<ApiTokenMeta[]>([])
  const [newToken, setNewToken] = useState('')
  const [tokenName, setTokenName] = useState('Cursor Agent')
  const [docs, setDocs] = useState<Record<string, unknown> | null>(null)

  const load = () => api.tokens().then((r) => setTokens(r.tokens))

  useEffect(() => {
    load()
    api.agentDocs().then(setDocs)
  }, [])

  const create = async () => {
    const res = await api.createToken(tokenName, ['read', 'write', 'crawl', 'agent'])
    setNewToken(res.token)
    load()
  }

  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin

  return (
    <div>
      <header className="page-header">
        <h2>SDK / Tokens</h2>
        <p className="muted">Gere tokens para o Cursor alterar targets e seletores via API</p>
      </header>

      <div className="panel">
        <h3>Gerar token SDK</h3>
        <div className="form-grid">
          <label>Nome do token<input className="input" value={tokenName} onChange={(e) => setTokenName(e.target.value)} /></label>
        </div>
        <button className="btn" onClick={create}>Gerar token</button>

        {newToken && (
          <div className="token-box">
            <p><strong>Token gerado (copie agora):</strong></p>
            <code className="mono token-value">{newToken}</code>
            <p className="small muted">Use no Cursor: Authorization: Bearer {newToken.slice(0, 16)}...</p>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Tokens ativos</h3>
        {tokens.map((t) => (
          <div key={t.id} className="target-card">
            <div>
              <strong>{t.name}</strong>
              <div className="mono small">{t.token_prefix}…</div>
              <div className="tags">{t.scopes.map((s) => <span key={s} className="tag">{s}</span>)}</div>
            </div>
            <button className="btn ghost danger" onClick={() => api.revokeToken(t.id).then(load)}>Revogar</button>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>Como usar no Cursor (chat)</h3>
        <pre className="code-block">{`Você tem acesso à API do crawler CoreSystemsTGR.

Base URL: ${baseUrl}
Token: <cole_o_token_gerado_acima>

Endpoints principais:
- GET  /api/agent/targets
- PUT  /api/agent/targets/:id  (atualizar seletores)
- POST /api/agent/crawl/:id    (testar crawl)
- GET  /api/agent/failures

Quando um seletor quebrar:
1. Leia a falha em /api/agent/failures
2. Atualize os fallbacks em /api/agent/targets/:id
3. Dispare POST /api/agent/crawl/:id para validar`}</pre>

        {docs && (
          <details>
            <summary>Documentação completa da API Agent</summary>
            <pre className="code-block">{JSON.stringify(docs, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  )
}
