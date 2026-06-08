import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function OverviewPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.stats().then((s) => setStats(s.totals)).catch((e) => setError(e.message))
  }, [])

  const rate = stats && stats.total_runs ? Math.round((stats.success_runs / stats.total_runs) * 100) : 0

  return (
    <div>
      <header className="page-header">
        <h2>Visão geral</h2>
        <p className="muted">Monitoramento em tempo real dos crawlers dos seus clientes</p>
      </header>
      {error && <div className="alert">{error}</div>}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><span>Targets ativos</span><strong>{stats.active_targets}</strong></div>
          <div className="stat-card"><span>Execuções</span><strong>{stats.total_runs}</strong></div>
          <div className="stat-card"><span>Taxa de sucesso</span><strong style={{ color: 'var(--success)' }}>{rate}%</strong></div>
          <div className="stat-card"><span>Falhas</span><strong style={{ color: 'var(--danger)' }}>{stats.total_failures}</strong></div>
        </div>
      )}
      <div className="quick-links">
        <Link className="card-link" to="/targets">+ Configurar URLs e seletores</Link>
        <Link className="card-link" to="/results">Ver dados extraídos</Link>
        <Link className="card-link" to="/settings">Gerar token SDK (Cursor)</Link>
      </div>
    </div>
  )
}
