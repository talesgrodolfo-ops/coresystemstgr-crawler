import { useEffect, useState } from 'react'
import { api } from '../api'
import type { CrawlFailure } from '../types'

export default function FailuresPage() {
  const [failures, setFailures] = useState<CrawlFailure[]>([])

  useEffect(() => {
    api.failures().then((r) => setFailures(r.failures))
  }, [])

  return (
    <div>
      <header className="page-header">
        <h2>Falhas</h2>
        <p className="muted">Erros enviados ao N8N — use o token SDK no Cursor para corrigir seletores</p>
      </header>
      <div className="failure-list">
        {failures.map((f) => (
          <article key={f.id} className="failure-card">
            <strong>{f.target_name}</strong>
            <p className="error-text">{f.error_message}</p>
            {f.selector && <p className="mono small">Seletor: {f.selector}</p>}
            <a className="link" href={f.url} target="_blank" rel="noreferrer">{f.url}</a>
            <p className="small">{new Date(f.created_at).toLocaleString('pt-BR')}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
