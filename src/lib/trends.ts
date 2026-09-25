import type { FallRecord, StaffKind } from '../data/fall.ts'
import { isClassifiedTemp, summarize } from './overview.ts'
import {
  openedLineOf,
  peerGroupOf,
  TREND_GROUPS,
  type TrendGroup,
  trendGroupOf,
} from './trend-groups.ts'

/** Each figure is `null` when the line has no job it applies to that year. */
export type TrendPoint = {
  year: number
  jobs: number
  /** Excludes classified temporaries. */
  spendCents: number | null
  fteHundredths: number | null
  /** Median published annual salary rate over primary jobs, temporaries excluded. */
  medianRateCents: number | null
}

export type TrendSeries = { key: string; points: TrendPoint[] }

export type TrendFilter = {
  kind: StaffKind | 'all'
  /** When set, the lines are this group's published EEO categories. */
  group: TrendGroup | null
  /** A pay department code. */
  dept: string | null
  /** A `peerGroupOf` key. */
  position: string | null
  from: number
  to: number
}

/** Whether a job in the given trend group passes the filter's staff kind, group, pay department, and class or rank; the years are not checked. */
export function matchesJob(
  record: FallRecord,
  group: TrendGroup,
  filter: TrendFilter,
): boolean {
  return (
    (filter.kind === 'all' || record.kind === filter.kind) &&
    (filter.group === null || group === filter.group) &&
    (filter.dept === null || record.payDepartment.code === filter.dept) &&
    (filter.position === null || peerGroupOf(record)?.key === filter.position)
  )
}

export type Trends = { series: TrendSeries[]; total: TrendPoint[] }

/** Rows and points with fewer jobs show no spend or median, so none gives one job's pay. */
export const MIN_JOBS_SHOWN = 3

const PERCENT = 100

/** The `p`th percentile of ascending values, interpolated between ranks. */
export function percentileOf(sorted: number[], p: number): number | null {
  const rank = ((sorted.length - 1) * p) / PERCENT
  const lower = sorted[Math.floor(rank)]
  const upper = sorted[Math.ceil(rank)]
  if (lower === undefined || upper === undefined) return null
  return lower + (upper - lower) * (rank - Math.floor(rank))
}

/** The `p`th percentile of ascending cents, rounded to the cent. */
export function percentileCents(sorted: number[], p: number): number | null {
  const value = percentileOf(sorted, p)
  return value === null ? null : Math.round(value)
}

const MEDIAN = 50

export function medianOf(values: number[]): number | null {
  return percentileOf(
    [...values].sort((a, b) => a - b),
    MEDIAN,
  )
}

export function medianRateCents(rates: number[]): number | null {
  const median = medianOf(rates)
  return median === null ? null : Math.round(median)
}

/** Jobs, spend and FTE, and the median rate of a set of jobs; FTE `null` when the set is empty, spend `null` under `MIN_JOBS_SHOWN` paid jobs, and median `null` under `MIN_JOBS_SHOWN` primary rates. */
export function measureJobs(records: FallRecord[]): Omit<TrendPoint, 'year'> {
  const paid = records.filter((record) => !isClassifiedTemp(record))
  const rates = paid
    .filter((record) => record.jobType === 'Primary')
    .map((record) => record.annualSalaryRateCents)
  return {
    jobs: records.length,
    spendCents:
      paid.length < MIN_JOBS_SHOWN ? null : summarize(paid).spendCents,
    fteHundredths:
      records.length === 0 ? null : summarize(records).fteHundredths,
    medianRateCents:
      rates.length < MIN_JOBS_SHOWN ? null : medianRateCents(rates),
  }
}

function measure(year: number, records: FallRecord[]): TrendPoint {
  return { year, ...measureJobs(records) }
}

const GROUP_ORDER: readonly string[] = TREND_GROUPS

/** One series per group (or per published category of an opened group), and their total, per census in range. */
export function buildTrends(
  years: { year: number; records: FallRecord[] }[],
  filter: TrendFilter,
): Trends {
  const inRange = years
    .filter(({ year }) => year >= filter.from && year <= filter.to)
    .sort((a, b) => a.year - b.year)
  const lines = new Map<string, Map<number, FallRecord[]>>()
  const total: TrendPoint[] = []
  for (const { year, records } of inRange) {
    const shown: FallRecord[] = []
    for (const record of records) {
      const group = trendGroupOf(record, year)
      if (!matchesJob(record, group, filter)) continue
      shown.push(record)
      const key = filter.group ? openedLineOf(record, filter.group) : group
      const byYear = lines.get(key) ?? new Map<number, FallRecord[]>()
      const members = byYear.get(year) ?? []
      members.push(record)
      byYear.set(year, members)
      lines.set(key, byYear)
    }
    total.push(measure(year, shown))
  }
  const series = [...lines.keys()]
    .sort((a, b) =>
      filter.group
        ? a.localeCompare(b)
        : GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b),
    )
    .map((key) => ({
      key,
      points: inRange.map(({ year }) =>
        measure(year, lines.get(key)?.get(year) ?? []),
      ),
    }))
  return { series, total }
}
