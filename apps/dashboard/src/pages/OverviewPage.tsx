import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import LineChart from '../components/LineChart'

export default function OverviewPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [last7Days, setLast7Days] = useState<{ day: string; runs: number; successes: number }[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.stats()
      .then((s) => {
        setStats(s.totals)
        setLast7Days(s.last7Days as { day: string; runs: number; successes: number }[])
      })
      .catch((e) => setError(e.message))
  }, [])

  const rate = stats && stats.total_runs ? Math.round((stats.success_runs / stats.total_runs) * 100) : 0

  const globalChart = last7Days.map((d) => {
    const [, m, day] = d.day.split('-')
    return { label: `${day}/${m}`, value: d.runs }
  })

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
      {globalChart.length > 0 && (
        <div className="panel">
          <h3>Execuções — últimos 7 dias (todos os crawlers)</h3>
          <LineChart color="var(--accent)" data={globalChart} />
        </div>
      )}
      <div className="quick-links">
        <Link className="card-link" to="/targets">+ Configurar URLs e seletores</Link>
        <Link className="card-link" to="/charts">Ver gráficos por crawler</Link>
        <Link className="card-link" to="/results">Ver dados extraídos</Link>
        <Link className="card-link" to="/settings">Gerar token SDK (Cursor)</Link>
      </div>
    </div>
  )
}
