import { useEffect, useState } from 'react'
import { api } from '../api'
import LineChart from '../components/LineChart'
import { buildTargetCharts, type TargetChart } from '../lib/chart-data'

export default function ChartsPage() {
  const [charts, setCharts] = useState<TargetChart[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.targets(), api.crawls(), api.failures()])
      .then(([t, c, f]) => setCharts(buildTargetCharts(t.targets, c.runs, f.failures)))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div>
      <header className="page-header">
        <h2>Gráficos</h2>
        <p className="muted">Métricas por crawler — execuções, itens extraídos e duração</p>
      </header>

      {error && <div className="alert">{error}</div>}

      {!charts.length && !error && <p className="muted">Nenhum target cadastrado.</p>}

      <div className="charts-grid">
        {charts.map((c) => (
          <article key={c.target.id} className="panel chart-card">
            <header className="chart-card-header">
              <div>
                <h3>{c.target.name}</h3>
                <p className="mono small muted">{c.target.url}</p>
              </div>
              <span className={`tag ${c.target.enabled ? '' : 'danger'}`}>{c.target.crawl_mode}</span>
            </header>

            <div className="chart-metrics">
              <div><span className="muted">Execuções</span><strong>{c.totalRuns}</strong></div>
              <div><span className="muted">Sucesso</span><strong style={{ color: 'var(--success)' }}>{c.successRate}%</strong></div>
              <div><span className="muted">Falhas</span><strong style={{ color: 'var(--danger)' }}>{c.failures}</strong></div>
              <div><span className="muted">Média itens</span><strong>{c.avgItems}</strong></div>
              <div><span className="muted">Duração média</span><strong>{c.avgDurationMs}ms</strong></div>
            </div>

            <div className="chart-block">
              <h4>Execuções — últimos 7 dias</h4>
              <LineChart
                color="var(--accent)"
                data={c.byDay.map((d) => ({ label: d.label, value: d.runs }))}
              />
              <div className="chart-legend">
                <span><i className="dot accent" /> total</span>
                <span className="muted small">
                  sucessos: {c.byDay.reduce((a, d) => a + d.successes, 0)}
                </span>
              </div>
            </div>

            <div className="chart-block">
              <h4>Itens extraídos — últimas execuções</h4>
              <LineChart
                color="var(--success)"
                data={c.recentItems.map((d) => ({ label: d.label, value: d.value }))}
              />
            </div>

            <div className="chart-block">
              <h4>Duração (s) — últimas execuções</h4>
              <LineChart
                color="#8b5cf6"
                data={c.recentDuration.map((d) => ({ label: d.label, value: d.value }))}
                valueSuffix="s"
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
