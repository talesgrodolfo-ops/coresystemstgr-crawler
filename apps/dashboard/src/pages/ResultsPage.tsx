import { useEffect, useState } from 'react'
import { api } from '../api'
import type { CrawlItem, CrawlRun } from '../types'

export default function ResultsPage() {
  const [runs, setRuns] = useState<CrawlRun[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [items, setItems] = useState<CrawlItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.crawls().then((r) => setRuns(r.runs)).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selected) return
    api.items(selected).then((r) => setItems(r.items)).catch(() => setItems([]))
  }, [selected])

  return (
    <div>
      <header className="page-header">
        <h2>Resultados</h2>
        <p className="muted">Dados extraídos por execução — clique para ver detalhes</p>
      </header>
      {error && <div className="alert">{error}</div>}

      <div className="columns">
        <div className="panel">
          <table>
            <thead><tr><th>Target</th><th>Itens</th><th>Quando</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={selected === r.id ? 'selected' : ''} onClick={() => setSelected(r.id)}>
                  <td><strong>{r.target_name}</strong></td>
                  <td>{r.items_count}</td>
                  <td>{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Dados extraídos</h3>
          {!selected && <p className="muted">Selecione uma execução</p>}
          {items.map((item, i) => (
            <div key={i} className="item-row">
              <div>
                <span className="mono">{item.field_name}</span>
                {item.page_url && <div className="small">{item.page_url}</div>}
              </div>
              <span>{item.field_value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
