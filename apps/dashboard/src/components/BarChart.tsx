type Bar = { label: string; value: number; color?: string }

export default function BarChart({
  data,
  height = 100,
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
  const padX = 16
  const padTop = 18
  const labelH = 22
  const chartWidth = Math.max(360, data.length * 52)
  const gap = 8
  const barWidth = (chartWidth - padX * 2 - gap * (data.length - 1)) / data.length
  const chartHeight = height + padTop + labelH

  return (
    <div className="bar-chart-wrap">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="bar-chart"
        role="img"
        aria-label="Gráfico de barras"
      >
        {data.map((d, i) => {
          const barH = Math.max(3, (d.value / max) * height)
          const x = padX + i * (barWidth + gap)
          const y = padTop + height - barH
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={d.color ?? 'var(--accent)'}
                opacity={0.9}
              />
              {d.value > 0 && (
                <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" className="chart-value">
                  {d.value}{valueSuffix}
                </text>
              )}
              <text x={x + barWidth / 2} y={padTop + height + 16} textAnchor="middle" className="chart-label">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
