import { TREND_GROUPS, type TrendGroup } from '../census/groups.ts'
import { changeOf } from '../shared/series.ts'
import type { ChangeSeries } from './pay-changes.ts'
import { METRIC_INFO, type ReportMetric } from './search.ts'
import type { TrendPoint, TrendSeries, Trends } from './trends.ts'

export const INDEX_BASE = 100

export const ALL_JOBS = 'All jobs'

/** The groups counted over each 100 faculty jobs. */
export const RATIO_GROUPS: readonly TrendGroup[] = [
  'Admins and professionals',
  'Executives',
]
export const RATIO_BASE_GROUP: TrendGroup = 'Faculty'
export const RATIO_COLUMNS: readonly TrendGroup[] = [
  ...RATIO_GROUPS,
  RATIO_BASE_GROUP,
]

/** Their rates are annualised hourly rates, so they have FTE but no spend, and their number swings from year to year, so the index chart leaves them to the table. */
export const UNPAID_GROUP: TrendGroup = 'Classified temporaries'

/** The groups with a job in the first or the last census; a group with neither has no change to show. */
export function atEitherEnd(series: TrendSeries[]): TrendSeries[] {
  return series.filter(
    ({ points }) =>
      (points[0]?.jobs ?? 0) > 0 || (points.at(-1)?.jobs ?? 0) > 0,
  )
}

export function pointOf(series: TrendSeries[], key: string, index: number) {
  return series.find((line) => line.key === key)?.points[index]
}

/** A figure's change from the first point to the last. */
export function changeOver(
  points: TrendPoint[],
  pick: (point: TrendPoint) => number | null,
): number | null {
  const first = points[0]
  const last = points.at(-1)
  return first && last ? changeOf(pick(first), pick(last)) : null
}

/** Each value over the first times 100; `null` when the first is missing or not above zero, so the line has no index. */
export function indexValues(
  values: (number | null)[],
): (number | null)[] | null {
  const [base] = values
  if (base === undefined || base === null || base <= 0) return null
  return values.map((value) =>
    value === null ? null : (value / base) * INDEX_BASE,
  )
}

export type IndexedLine = {
  key: string
  values: (number | null)[]
  isBaseline?: boolean
}

/**
 * Every group in `TREND_GROUPS` order, indexed to the first census, then all
 * jobs as the baseline; a group keeps its place when it has no index, so its
 * color does not move. `hidden` are the lines not drawn: those with no index,
 * and `UNPAID_GROUP`; `unindexed` are those with no index and a job in the
 * range.
 */
export function indexedGroups(
  { series, total }: Trends,
  metric: ReportMetric,
): { lines: IndexedLine[]; hidden: string[]; unindexed: string[] } {
  const { pick } = METRIC_INFO[metric]
  const groups = TREND_GROUPS.map((key) => {
    const points = series.find((line) => line.key === key)?.points
    return {
      key,
      values: points ? indexValues(points.map(pick)) : null,
      isPresent: points !== undefined,
    }
  })
  const withoutIndex = groups.filter(({ values }) => values === null)
  return {
    lines: [
      ...groups.map(({ key, values }) => ({ key, values: values ?? [] })),
      {
        key: ALL_JOBS,
        values: indexValues(total.map(pick)) ?? [],
        isBaseline: true,
      },
    ],
    hidden: [...new Set([...withoutIndex.map(({ key }) => key), UNPAID_GROUP])],
    unindexed: withoutIndex
      .filter(({ isPresent }) => isPresent)
      .map(({ key }) => key),
  }
}

export type ChangeRow = { key: string } & Record<ReportMetric, number | null>

function changeRow(key: string, points: TrendPoint[]): ChangeRow {
  const changeIn = (metric: ReportMetric) =>
    changeOver(points, METRIC_INFO[metric].pick)
  return {
    key,
    jobs: changeIn('jobs'),
    fte: changeIn('fte'),
    spend: changeIn('spend'),
    median: changeIn('median'),
  }
}

/** Each group's change from the first year to the last in every measure, then all jobs'. */
export function changeTable({ series, total }: Trends): ChangeRow[] {
  return [
    ...atEitherEnd(series).map(({ key, points }) => changeRow(key, points)),
    changeRow(ALL_JOBS, total),
  ]
}

/** One census's jobs in each of `RATIO_COLUMNS`, and `RATIO_GROUPS` jobs per 100 `RATIO_BASE_GROUP` jobs; `null` with no faculty job. */
export type RatioRow = { year: number; jobs: number[]; ratio: number | null }

export function staffingRows({ series, total }: Trends): RatioRow[] {
  return total.map(({ year }, index) => {
    const jobs = RATIO_COLUMNS.map(
      (group) => pointOf(series, group, index)?.jobs ?? 0,
    )
    const faculty = jobs.at(-1) ?? 0
    const counted = jobs.slice(0, -1).reduce((sum, count) => sum + count, 0)
    return {
      year,
      jobs,
      ratio: faculty === 0 ? null : (counted / faculty) * INDEX_BASE,
    }
  })
}

/** One change after another, compounded; `null` when there is none or any is missing. */
export function chainedChange(changes: (number | null)[]): number | null {
  if (changes.length === 0 || changes.includes(null)) return null
  return (
    changes.reduce<number>(
      (product, change) => product * (1 + (change ?? 0)),
      1,
    ) - 1
  )
}

export type RaiseRow = {
  key: string
  medians: (number | null)[]
  chained: number | null
}

/** Each line's median change for the given pairs, and those medians chained; a line with no median in them is left out. */
export function raiseRows(
  series: ChangeSeries[],
  fromYears: number[],
): RaiseRow[] {
  return series.flatMap(({ key, points }) => {
    const medians = fromYears.map(
      (year) =>
        points.find(({ fromYear }) => fromYear === year)?.median ?? null,
    )
    return medians.every((median) => median === null)
      ? []
      : [{ key, medians, chained: chainedChange(medians) }]
  })
}

/** The upper bounds of a median change's shading levels, as fractions. */
const HEAT_LEVELS = [0.005, 0.025, 0.04, 0.06, 0.09]

/** A median change's shading level, from 0 (none) to `HEAT_LEVELS.length`. */
export function heatLevel(change: number): number {
  return HEAT_LEVELS.filter((bound) => change >= bound).length
}
