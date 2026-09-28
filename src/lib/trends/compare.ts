import type { CodeTrend, ScopeTrends, SummaryArea } from '../../data/summary.ts'
import { formatChange, formatList } from '../shared/format.ts'
import { changeOver, type IndexedLine, indexValues } from './report.ts'
import { METRIC_INFO, type ReportMetric, type YearRange } from './search.ts'

/** A scope's totals in each census, the figures the comparison reads. */
export function totalsOf({ code, name, trends }: ScopeTrends): CodeTrend {
  return { code, name, points: trends.total }
}

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
    : `${base}, against ${formatList(against)}.`
}

/** An area or unit a reader can add to the comparison; `area` names a unit's area and is `null` for an area. */
export type CompareOption = { code: string; name: string; area: string | null }

/** Every area, then every unit and pay department under its area's name. */
export function compareOptions(areas: SummaryArea[]): CompareOption[] {
  return [
    ...areas.map(({ code, name }) => ({ code, name, area: null })),
    ...areas.flatMap(({ name: area, units }) =>
      units.map(({ code, name }) => ({ code, name, area })),
    ),
  ]
}

const MATCH_LIMIT = 8

/** The options whose name and area hold every word of the query, ignoring case, those whose name starts with the query first; none for an empty query, and none already chosen. */
export function matchOptions(
  options: CompareOption[],
  query: string,
  chosen: string[],
): CompareOption[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []
  const words = needle.split(/\s+/)
  const starts = (option: CompareOption) =>
    option.name.toLowerCase().startsWith(needle) ? 0 : 1
  return options
    .filter(({ code, name, area }) => {
      const text = `${name} ${area ?? ''}`.toLowerCase()
      return (
        !chosen.includes(code) && words.every((word) => text.includes(word))
      )
    })
    .sort((a, b) => starts(a) - starts(b))
    .slice(0, MATCH_LIMIT)
}
