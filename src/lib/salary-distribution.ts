import type { FallRecord, StaffKind } from '../data/fall.ts'
import { CENTS_PER_DOLLAR, formatDollars } from './format.ts'
import { isClassifiedTemp } from './overview.ts'
import { isPrimaryJob } from './person-lookup.ts'
import {
  emptyCounts,
  type GroupCounts,
  type TrendGroup,
  trendGroupOf,
} from './trend-groups.ts'
import { MIN_JOBS_SHOWN, percentileCents } from './trends.ts'

const SALARY_BIN_CENTS = 1_000_000
const TOP_BIN_FLOOR_CENTS = 25_000_000
const CENTS_PER_THOUSAND_DOLLARS = 100_000

export const RATE_NOTE =
  'Rates are the annual salary rates UO publishes, not pay: a 9-month rate is the 9-month salary, a part-time job’s rate is its full-time rate, and classified temporaries’ rates are annualised hourly rates. Dollars are as published, not adjusted for inflation.'

export const PERCENTILES = [10, 25, 50, 75, 90] as const
export type Percentile = (typeof PERCENTILES)[number]

export const TERMS = [9, 12] as const
export type Term = (typeof TERMS)[number]

export type SalaryBin = {
  floorCents: number
  /** Exclusive; `null` for the open top bin. */
  ceilingCents: number | null
  counts: GroupCounts
  total: number
}

export type Distribution = {
  bins: SalaryBin[]
  counts: GroupCounts
  maxRateCents: number | null
  /** Over primary jobs, temporaries left out; `null` when fewer than `MIN_JOBS_SHOWN`. */
  percentiles: Record<Percentile, number> | null
}

function primaryPercentiles(
  records: FallRecord[],
): Distribution['percentiles'] {
  const rates = records
    .filter((record) => isPrimaryJob(record) && !isClassifiedTemp(record))
    .map((record) => record.annualSalaryRateCents)
    .sort((a, b) => a - b)
  if (rates.length < MIN_JOBS_SHOWN) return null
  const at = (p: Percentile) => percentileCents(rates, p) ?? 0
  return { 10: at(10), 25: at(25), 50: at(50), 75: at(75), 90: at(90) }
}

/** Published annual salary rates in $10,000 bins up to an open top bin, stacked by group. */
export function buildDistribution(
  records: FallRecord[],
  censusYear: number,
): Distribution {
  const binCount = TOP_BIN_FLOOR_CENTS / SALARY_BIN_CENTS + 1
  const bins: SalaryBin[] = Array.from({ length: binCount }, (_, index) => {
    const floorCents = index * SALARY_BIN_CENTS
    return {
      floorCents,
      ceilingCents:
        floorCents === TOP_BIN_FLOOR_CENTS
          ? null
          : floorCents + SALARY_BIN_CENTS,
      counts: emptyCounts(),
      total: 0,
    }
  })
  const counts = emptyCounts()
  let maxRateCents: number | null = null
  for (const record of records) {
    const rate = record.annualSalaryRateCents
    const group = trendGroupOf(record, censusYear)
    const bin =
      bins[Math.min(Math.floor(rate / SALARY_BIN_CENTS), binCount - 1)]
    if (bin) {
      bin.counts[group] += 1
      bin.total += 1
    }
    counts[group] += 1
    maxRateCents = Math.max(maxRateCents ?? rate, rate)
  }
  return {
    bins,
    counts,
    maxRateCents,
    percentiles: primaryPercentiles(records),
  }
}

export type JobFilter = {
  group: TrendGroup | null
  kind: StaffKind | 'all'
  term: Term | null
  position: string | null
}

/** A job's position class code if classified, or its rank if unclassified, as published. */
export function positionOf(record: FallRecord): string | null {
  return record.kind === 'classified'
    ? (record.positionClass?.code ?? null)
    : record.rank
}

/** How a position reads on the page: a class's title and code, or a rank. */
export function positionLabel(records: FallRecord[], position: string): string {
  const classified = records.find(
    (record) =>
      record.kind === 'classified' && record.positionClass?.code === position,
  )
  const title =
    classified?.kind === 'classified' ? classified.positionClass?.title : null
  return formatPosition(position, title)
}

/** A position key as it reads: a class's title and code, or the key alone. */
export function formatPosition(
  position: string,
  title: string | null | undefined,
): string {
  return title ? `${title} (${position})` : position
}

export function filterJobs(
  records: FallRecord[],
  { group, kind, term, position }: JobFilter,
  censusYear: number,
): FallRecord[] {
  return records.filter(
    (record) =>
      (kind === 'all' || record.kind === kind) &&
      (term === null || record.termOfServiceMonths === term) &&
      (position === null || positionOf(record) === position) &&
      (group === null || trendGroupOf(record, censusYear) === group),
  )
}

/** A bin's axis label, e.g. `$50K`, or `$250K+` for the open top bin. */
export function binLabel({ floorCents, ceilingCents }: SalaryBin): string {
  const thousands = floorCents / CENTS_PER_THOUSAND_DOLLARS
  const floor = thousands === 0 ? '$0' : `$${thousands}K`
  return ceilingCents === null ? `${floor}+` : floor
}

/** A bin's range in whole dollars, e.g. `$50,000 to $59,999`. */
export function binRange({ floorCents, ceilingCents }: SalaryBin): string {
  const floor = formatDollars(floorCents)
  return ceilingCents === null
    ? `${floor} and over`
    : `${floor} to ${formatDollars(ceilingCents - CENTS_PER_DOLLAR)}`
}
