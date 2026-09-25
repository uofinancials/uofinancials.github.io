import type { FallRecord, StaffKind } from '../data/fall.ts'
import { MIN_JOBS_SHOWN } from './department-jobs.ts'
import { isClassifiedTemp } from './overview.ts'
import { type TrendGroup, trendGroupOf } from './trend-groups.ts'

export const SALARY_BIN_CENTS = 1_000_000
export const TOP_BIN_FLOOR_CENTS = 25_000_000
const PERCENT = 100

export const JOB_KINDS = [
  'Primary jobs',
  'Secondary and overload jobs',
  'Classified temporaries',
] as const
export type JobKind = (typeof JOB_KINDS)[number]

export const PERCENTILES = [10, 25, 50, 75, 90] as const
export type Percentile = (typeof PERCENTILES)[number]

export const TERMS = [9, 12] as const
export type Term = (typeof TERMS)[number]

export function jobKindOf(record: FallRecord): JobKind {
  if (isClassifiedTemp(record)) return 'Classified temporaries'
  return record.jobType === 'Primary'
    ? 'Primary jobs'
    : 'Secondary and overload jobs'
}

/** The `p`th percentile of ascending cents, interpolated between ranks and rounded to the cent. */
export function percentileCents(sorted: number[], p: number): number | null {
  const rank = ((sorted.length - 1) * p) / PERCENT
  const lower = sorted[Math.floor(rank)]
  const upper = sorted[Math.ceil(rank)]
  if (lower === undefined || upper === undefined) return null
  return Math.round(lower + (upper - lower) * (rank - Math.floor(rank)))
}

export type SalaryBin = {
  floorCents: number
  /** Exclusive; `null` for the open top bin. */
  ceilingCents: number | null
  counts: Record<JobKind, number>
}

export type Distribution = {
  bins: SalaryBin[]
  counts: Record<JobKind, number>
  maxRateCents: number | null
  /** Over primary jobs; `null` when fewer than `MIN_JOBS_SHOWN` are primary. */
  percentiles: Record<Percentile, number> | null
}

function emptyCounts(): Record<JobKind, number> {
  return {
    'Primary jobs': 0,
    'Secondary and overload jobs': 0,
    'Classified temporaries': 0,
  }
}

function primaryPercentiles(
  records: FallRecord[],
): Distribution['percentiles'] {
  const rates = records
    .filter((record) => jobKindOf(record) === 'Primary jobs')
    .map((record) => record.annualSalaryRateCents)
    .sort((a, b) => a - b)
  if (rates.length < MIN_JOBS_SHOWN) return null
  const at = (p: Percentile) => percentileCents(rates, p) ?? 0
  return { 10: at(10), 25: at(25), 50: at(50), 75: at(75), 90: at(90) }
}

/** Published annual salary rates in $10,000 bins up to an open top bin, stacked by job kind. */
export function buildDistribution(records: FallRecord[]): Distribution {
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
    }
  })
  const counts = emptyCounts()
  let maxRateCents: number | null = null
  for (const record of records) {
    const rate = record.annualSalaryRateCents
    const kind = jobKindOf(record)
    const bin =
      bins[Math.min(Math.floor(rate / SALARY_BIN_CENTS), binCount - 1)]
    if (bin) bin.counts[kind] += 1
    counts[kind] += 1
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
}

export function filterJobs(
  records: FallRecord[],
  { group, kind, term }: JobFilter,
  censusYear: number,
): FallRecord[] {
  return records.filter(
    (record) =>
      (kind === 'all' || record.kind === kind) &&
      (term === null || record.termOfServiceMonths === term) &&
      (group === null || trendGroupOf(record, censusYear) === group),
  )
}
