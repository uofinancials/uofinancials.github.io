import type { FallRecord, StaffKind } from '../data/fall.ts'
import { isClassifiedTemp, jobSpendCents } from './overview.ts'
import { TREND_GROUPS, type TrendGroup, trendGroupOf } from './trend-groups.ts'

/** Each figure is `null` when the line has no job it applies to that year. */
export type TrendPoint = {
  year: number
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
  from: number
  to: number
}

export type Trends = { series: TrendSeries[]; total: TrendPoint[] }

export const NO_CATEGORY = 'No category'

export function medianRateCents(rates: number[]): number | null {
  const sorted = [...rates].sort((a, b) => a - b)
  const upper = sorted[Math.floor(sorted.length / 2)]
  if (upper === undefined) return null
  if (sorted.length % 2 === 1) return upper
  const lower = sorted[sorted.length / 2 - 1] ?? upper
  return Math.round((lower + upper) / 2)
}

function measure(year: number, records: FallRecord[]): TrendPoint {
  const paid = records.filter((record) => !isClassifiedTemp(record))
  return {
    year,
    spendCents:
      paid.length === 0
        ? null
        : paid.reduce((sum, record) => sum + jobSpendCents(record), 0),
    fteHundredths:
      records.length === 0
        ? null
        : records.reduce((sum, record) => sum + record.apptPercent, 0),
    medianRateCents: medianRateCents(
      paid
        .filter((record) => record.jobType === 'Primary')
        .map((record) => record.annualSalaryRateCents),
    ),
  }
}

const GROUP_ORDER: readonly string[] = TREND_GROUPS

function lineOrder(isOpened: boolean) {
  return (a: string, b: string) =>
    isOpened
      ? a.localeCompare(b)
      : GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
}

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
    const shown = records.filter(
      (record) =>
        (filter.kind === 'all' || record.kind === filter.kind) &&
        (filter.group === null || trendGroupOf(record, year) === filter.group),
    )
    total.push(measure(year, shown))
    for (const record of shown) {
      const key = filter.group
        ? (record.eeoCategory ?? NO_CATEGORY)
        : trendGroupOf(record, year)
      const byYear = lines.get(key) ?? new Map<number, FallRecord[]>()
      const members = byYear.get(year) ?? []
      members.push(record)
      byYear.set(year, members)
      lines.set(key, byYear)
    }
  }
  const series = [...lines.keys()]
    .sort(lineOrder(filter.group !== null))
    .map((key) => ({
      key,
      points: inRange.map(({ year }) =>
        measure(year, lines.get(key)?.get(year) ?? []),
      ),
    }))
  return { series, total }
}
