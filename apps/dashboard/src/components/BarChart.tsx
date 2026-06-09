type Bar = { label: string; value: number; color?: string }

export default function BarChart({
  data,
  height = 120,
  valueSuffix = '',
}: {
  data: Bar[]
  height?: number
  valueSuffix?: string
}) {
  if (!data.length) {
    return <p className="muted chart-empty">Sem dados ainda</p>
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const barWidth = Math.min(48, Math.floor(320 / data.length) - 8)
  const width = data.length * (barWidth + 8) + 16

  return (
    <div className="bar-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height + 28}`} className="bar-chart" role="img">
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / max) * height)
          const x = 8 + i * (barWidth + 8)
          const y = height - h
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={4}
                fill={d.color ?? 'var(--accent)'}
                opacity={0.9}
              />
              <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" className="chart-label">
                {d.label}
              </text>
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="chart-value">
                {d.value}{valueSuffix}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
