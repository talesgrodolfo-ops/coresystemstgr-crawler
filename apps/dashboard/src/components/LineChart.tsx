type Point = { label: string; value: number; color?: string }

export default function LineChart({
  data,
  height = 100,
  valueSuffix = '',
  color = 'var(--accent)',
}: {
  data: Point[]
  height?: number
  valueSuffix?: string
  color?: string
}) {
  if (!data.length) {
    return <p className="muted chart-empty">Sem dados ainda</p>
  }

  const stroke = color
  const max = Math.max(...data.map((d) => d.value), 1)
  const padX = 28
  const padTop = 20
  const labelH = 22
  const chartWidth = Math.max(360, data.length * 48)
  const chartHeight = height + padTop + labelH
  const plotW = chartWidth - padX * 2
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = padX + (data.length > 1 ? i * stepX : plotW / 2)
    const y = padTop + height - (d.value / max) * height
    return { ...d, x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${padTop + height} L ${points[0].x} ${padTop + height} Z`
      : ''

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="chart-svg"
        role="img"
        aria-label="Gráfico de linha"
      >
        <line
          x1={padX}
          y1={padTop + height}
          x2={chartWidth - padX}
          y2={padTop + height}
          className="chart-axis"
        />
        {areaPath && <path d={areaPath} fill={stroke} opacity={0.12} />}
        {points.length > 1 && (
          <path d={linePath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={p.x} cy={p.y} r={4} fill={stroke} stroke="var(--surface)" strokeWidth={2} />
            {(p.value > 0 || data.length <= 8) && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" className="chart-value">
                {p.value}{valueSuffix}
              </text>
            )}
            <text x={p.x} y={padTop + height + 16} textAnchor="middle" className="chart-label">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
