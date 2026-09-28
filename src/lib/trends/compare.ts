import { formatChange } from '../shared/format.ts'
import { changeOf } from '../shared/series.ts'
import type { CodeTrend } from './area-trends.ts'
import { type IndexedLine, indexValues } from './report.ts'
import { METRIC_INFO, type ReportMetric } from './search.ts'
import type { TrendPoint } from './trends.ts'

export const ALL_OF_UO = 'All of UO'

export type CompareLine = { key: string; points: TrendPoint[] }

function inRange(points: TrendPoint[], from: number, to: number) {
  return points.filter(({ year }) => year >= from && year <= to)
}

/** The unit, its area, and the university, each indexed to the first census in the range; a line with no index is left out and named in `unindexed`. */
export function compareLines(
  lines: CompareLine[],
  metric: ReportMetric,
  { from, to }: { from: number; to: number },
): { lines: IndexedLine[]; unindexed: string[] } {
  const { pick } = METRIC_INFO[metric]
  const indexed = lines.map(({ key, points }, index) => ({
    key,
    values: indexValues(inRange(points, from, to).map(pick)),
    isBaseline: index === lines.length - 1,
  }))
  return {
    lines: indexed.flatMap(({ key, values, isBaseline }) =>
      values ? [{ key, values, isBaseline }] : [],
    ),
    unindexed: indexed
      .filter(({ values }) => values === null)
      .map(({ key }) => key),
  }
}

export type CompareRow = {
  code: string
  name: string
  jobs: number
  fte: number | null
  spend: number | null
}

/** Each code's jobs in the last census and its change in FTE and spend over the range, most jobs first; a code with no job in the range is left out. */
export function compareRows(
  codes: CodeTrend[],
  { from, to }: { from: number; to: number },
): CompareRow[] {
  return codes
    .flatMap(({ code, name, points }) => {
      const shown = inRange(points, from, to)
      const first = shown[0]
      const last = shown.at(-1)
      if (!first || !last || shown.every(({ jobs }) => jobs === 0)) return []
      return [
        {
          code,
          name,
          jobs: last.jobs,
          fte: changeOf(first.fteHundredths, last.fteHundredths),
          spend: changeOf(first.spendCents, last.spendCents),
        },
      ]
    })
    .sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name))
}

/** The first line's change in the measure over the range, against the others'. */
export function compareAnswer(
  lines: CompareLine[],
  metric: ReportMetric,
  { from, to }: { from: number; to: number },
): string | null {
  const { pick, noun } = METRIC_INFO[metric]
  const changes = lines.map(({ key, points }) => {
    const shown = inRange(points, from, to)
    const first = shown[0]
    const last = shown.at(-1)
    return {
      key,
      change: first && last ? changeOf(pick(first), pick(last)) : null,
    }
  })
  const [subject, ...others] = changes
  if (!subject || subject.change === null) return null
  const against = others.flatMap(({ key, change }) =>
    change === null ? [] : [`${formatChange(change)} for ${key}`],
  )
  const base = `${subject.key}: ${noun} ${formatChange(subject.change)} since Fall ${from}`
  return against.length === 0
    ? `${base}.`
    : `${base}, against ${against.join(' and ')}.`
}
