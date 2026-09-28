import type { CodeTrend } from '../../data/summary.ts'
import { formatChange } from '../shared/format.ts'
import { changeOver, type IndexedLine, indexValues } from './report.ts'
import { METRIC_INFO, type ReportMetric, type YearRange } from './search.ts'

export const ALL_OF_UO = 'All of UO'

/** Each code's points in the range. */
export function inRange(
  codes: CodeTrend[],
  { from, to }: YearRange,
): CodeTrend[] {
  return codes.map((code) => ({
    ...code,
    points: code.points.filter(({ year }) => year >= from && year <= to),
  }))
}

/** The codes indexed to their first census, the last as the baseline; a code with no index is left out and named in `unindexed`. The labels are the last code's censuses. */
export function compareLines(
  codes: CodeTrend[],
  metric: ReportMetric,
): { labels: string[]; lines: IndexedLine[]; unindexed: string[] } {
  const { pick } = METRIC_INFO[metric]
  const indexed = codes.map(({ name, points }, index) => ({
    key: name,
    values: indexValues(points.map(pick)),
    isBaseline: index === codes.length - 1,
  }))
  return {
    labels: codes.at(-1)?.points.map(({ year }) => String(year)) ?? [],
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

/** Each code's jobs in its last census and its change in FTE and spend, most jobs first; a code with no job is left out. */
export function compareRows(codes: CodeTrend[]): CompareRow[] {
  return codes
    .flatMap(({ code, name, points }) =>
      points.every(({ jobs }) => jobs === 0)
        ? []
        : [
            {
              code,
              name,
              jobs: points.at(-1)?.jobs ?? 0,
              fte: changeOver(points, ({ fteHundredths }) => fteHundredths),
              spend: changeOver(points, ({ spendCents }) => spendCents),
            },
          ],
    )
    .sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name))
}

/** Each code's change in the measure from its first census to its last. */
export function lineChanges(
  codes: CodeTrend[],
  metric: ReportMetric,
): { key: string; change: number | null }[] {
  return codes.map(({ name, points }) => ({
    key: name,
    change: changeOver(points, METRIC_INFO[metric].pick),
  }))
}

/** The first code's change in the measure, against the others'. */
export function compareAnswer(
  codes: CodeTrend[],
  metric: ReportMetric,
  from: number,
): string | null {
  const [subject, ...others] = lineChanges(codes, metric)
  if (!subject || subject.change === null) return null
  const against = others.flatMap(({ key, change }) =>
    change === null ? [] : [`${formatChange(change)} for ${key}`],
  )
  const base = `${subject.key}: ${METRIC_INFO[metric].noun} ${formatChange(subject.change)} since Fall ${from}`
  return against.length === 0
    ? `${base}.`
    : `${base}, against ${against.join(' and ')}.`
}
