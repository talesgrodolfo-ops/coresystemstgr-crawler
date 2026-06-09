import type { CrawlFailure, CrawlRun, CrawlTarget } from '../types'

export type TargetChart = {
  target: CrawlTarget
  totalRuns: number
  successRuns: number
  failures: number
  successRate: number
  avgDurationMs: number
  avgItems: number
  byDay: { label: string; runs: number; successes: number; items: number }[]
  recentItems: { label: string; value: number }[]
  recentDuration: { label: string; value: number }[]
}

function last7DayLabels(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function shortDay(iso: string) {
  const [, m, day] = iso.split('-')
  return `${day}/${m}`
}

export function buildTargetCharts(
  targets: CrawlTarget[],
  runs: CrawlRun[],
  failures: CrawlFailure[]
): TargetChart[] {
  const dayKeys = last7DayLabels()

  return targets.map((target) => {
    const targetRuns = runs.filter((r) => r.target_id === target.id)
    const targetFailures = failures.filter((f) => f.target_id === target.id)
    const successRuns = targetRuns.filter((r) => r.status === 'success')
    const totalRuns = targetRuns.length
    const successRate = totalRuns ? Math.round((successRuns.length / totalRuns) * 100) : 0

    const durations = successRuns.map((r) => r.duration_ms ?? 0).filter((d) => d > 0)
    const avgDurationMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

    const avgItems = successRuns.length
      ? Math.round(successRuns.reduce((a, r) => a + r.items_count, 0) / successRuns.length)
      : 0

    const byDay = dayKeys.map((day) => {
      const dayRuns = targetRuns.filter((r) => r.created_at.slice(0, 10) === day)
      return {
        label: shortDay(day),
        runs: dayRuns.length,
        successes: dayRuns.filter((r) => r.status === 'success').length,
        items: dayRuns.reduce((a, r) => a + r.items_count, 0),
      }
    })

    const recent = [...targetRuns].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8).reverse()

    return {
      target,
      totalRuns,
      successRuns: successRuns.length,
      failures: targetFailures.length,
      successRate,
      avgDurationMs,
      avgItems,
      byDay,
      recentItems: recent.map((r, i) => ({
        label: `#${i + 1}`,
        value: r.items_count,
      })),
      recentDuration: recent.map((r, i) => ({
        label: `#${i + 1}`,
        value: Math.round((r.duration_ms ?? 0) / 100) / 10,
      })),
    }
  })
}
