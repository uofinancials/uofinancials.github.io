import {
  type FallRecord,
  isPrimaryJob,
  type StaffKind,
} from '../../data/fall.ts'
import type { Manifest } from '../../data/manifest.ts'
import {
  compareLines,
  lineOf,
  TEMPS_GROUP,
  type TrendGroup,
  trendGroupOf,
} from '../census/groups.ts'
import {
  fiscalYearOf,
  isClassifiedTemp,
  sumFteHundredths,
  sumSpendCents,
} from '../census/totals.ts'
import { peerGroupOf } from '../people/peer-group.ts'
import type { SectionSource } from '../shared/citation.ts'
import { groupBy } from '../shared/group.ts'

/** Classified temporaries' actual FY pay and estimated FTE in one scope and census, how many FY jobs they cover, and the fiscal year the census falls in. */
export type TempsFigure = {
  fiscalYear: number
  jobs: number
  payCents: number
  fteHundredths: number
}

/** Each figure is `null` when the line has no job it applies to that year. */
export type TrendPoint = {
  year: number
  jobs: number
  /** Rate × FTE over every job but classified temporaries, plus their FY pay where `fyTemps` is set. */
  spendCents: number | null
  /** As spend: temporaries count only where `fyTemps` is set. */
  fteHundredths: number | null
  /** Median published annual salary rate over primary jobs. */
  medianRateCents: number | null
  /** Set where spend and FTE include classified temporaries' FY figures: the fiscal year they come from, and the spend and FTE without them. */
  fyTemps?: {
    fiscalYear: number
    otherSpendCents: number | null
    otherFteHundredths: number | null
  }
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
function matchesJob(
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

/** The earlier census of each consecutive pair of listed censuses with both in the range. */
export function pairYears(years: number[], from: number, to: number): number[] {
  return years.filter(
    (year) => year >= from && year + 1 <= to && years.includes(year + 1),
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

/**
 * Jobs, spend and FTE, and the median rate of a set of jobs. Classified
 * temporaries count in spend and FTE only through `temps`, their FY figures,
 * which are left out when they cover one or two jobs. FTE is `null` with
 * nothing to count; spend is `null` when the other jobs are one or two, since
 * temporaries' pay shows on its own line, or under `MIN_JOBS_SHOWN` jobs in
 * all; the median, over every primary job's rate, temporaries' included, is
 * `null` under `MIN_JOBS_SHOWN` of them.
 */
export function measureJobs(
  records: FallRecord[],
  temps: TempsFigure | null = null,
): Omit<TrendPoint, 'year'> {
  const paid = records.filter((record) => !isClassifiedTemp(record))
  const rates = records
    .filter(isPrimaryJob)
    .map((record) => record.annualSalaryRateCents)
  const counted =
    temps && (temps.jobs === 0 || temps.jobs >= MIN_JOBS_SHOWN) ? temps : null
  const otherSpendCents =
    paid.length < MIN_JOBS_SHOWN ? null : sumSpendCents(paid)
  const otherFteHundredths = paid.length === 0 ? null : sumFteHundredths(paid)
  const medianRate =
    rates.length < MIN_JOBS_SHOWN ? null : medianRateCents(rates)
  if (!counted) {
    return {
      jobs: records.length,
      spendCents: otherSpendCents,
      fteHundredths: otherFteHundredths,
      medianRateCents: medianRate,
    }
  }
  const isOtherSpendShown = paid.length === 0 || otherSpendCents !== null
  return {
    jobs: records.length,
    spendCents:
      !isOtherSpendShown || paid.length + counted.jobs < MIN_JOBS_SHOWN
        ? null
        : (otherSpendCents ?? 0) + counted.payCents,
    fteHundredths:
      paid.length + counted.jobs === 0
        ? null
        : (otherFteHundredths ?? 0) + counted.fteHundredths,
    medianRateCents: medianRate,
    fyTemps: {
      fiscalYear: counted.fiscalYear,
      otherSpendCents,
      otherFteHundredths,
    },
  }
}

/** Whether a filter keeps classified temporaries whole, so their FY figures for the scope apply: not narrowed to unclassified jobs, a pay department, a class or rank, or another group. */
function keepsTempsWhole(filter: TrendFilter): boolean {
  return (
    filter.kind !== 'unclassified' &&
    filter.dept === null &&
    filter.position === null &&
    (filter.group === null || filter.group === TEMPS_GROUP)
  )
}

type KeptJob = { record: FallRecord; line: string }

function keptJobs(
  { year, records }: { year: number; records: FallRecord[] },
  filter: TrendFilter,
): KeptJob[] {
  return records.flatMap((record) => {
    const group = trendGroupOf(record, year)
    return matchesJob(record, group, filter)
      ? [{ record, line: lineOf(record, group, filter.group) }]
      : []
  })
}

const recordsOf = (jobs: KeptJob[] = []) => jobs.map(({ record }) => record)

/** One series per group (or per published category of an opened group), and their total, per census in range; `temps` are the scope's classified temporaries' FY figures by census year. */
export function buildTrends(
  years: { year: number; records: FallRecord[] }[],
  filter: TrendFilter,
  temps: ReadonlyMap<number, TempsFigure>,
): Trends {
  const tempsIn = (year: number) =>
    keepsTempsWhole(filter) ? (temps.get(year) ?? null) : null
  const kept = [...years]
    .sort((a, b) => a.year - b.year)
    .map((census) => {
      const jobs = keptJobs(census, filter)
      return {
        year: census.year,
        jobs,
        byLine: groupBy(jobs, ({ line }) => line),
      }
    })
  const seeded =
    filter.group === null && kept.some(({ year }) => tempsIn(year))
      ? [TEMPS_GROUP]
      : []
  const lines = new Set([
    ...seeded,
    ...kept.flatMap(({ byLine }) => [...byLine.keys()]),
  ])
  const total = kept.map(({ year, jobs }) => ({
    year,
    ...measureJobs(recordsOf(jobs), tempsIn(year)),
  }))
  const series = [...lines].sort(compareLines(filter.group)).map((key) => ({
    key,
    points: kept.map(({ year, byLine }) => ({
      year,
      ...measureJobs(
        recordsOf(byLine.get(key)),
        key === TEMPS_GROUP ? tempsIn(year) : null,
      ),
    })),
  }))
  return sliceTrends({ series, total }, filter.from, filter.to)
}

/** The years `from` to `to` of trends, dropping the lines with no job in them. */
export function sliceTrends(trends: Trends, from: number, to: number): Trends {
  const isInRange = ({ year }: { year: number }) => year >= from && year <= to
  return {
    series: trends.series
      .map(({ key, points }) => ({ key, points: points.filter(isInRange) }))
      .filter(({ points }) =>
        points.some(({ jobs, fyTemps }) => jobs > 0 || fyTemps),
      ),
    total: trends.total.filter(isInRange),
  }
}

/** Points with classified temporaries' FY figures taken out of every one when some census with jobs has none, so no change compares a year with them to a year without. */
export function comparablePoints(points: TrendPoint[]): TrendPoint[] {
  const isMissing = ({ jobs, fyTemps }: TrendPoint) => jobs > 0 && !fyTemps
  if (!points.some(({ fyTemps }) => fyTemps) || !points.some(isMissing)) {
    return points
  }
  return points.map(({ fyTemps, ...point }) =>
    fyTemps
      ? {
          ...point,
          spendCents: fyTemps.otherSpendCents,
          fteHundredths: fyTemps.otherFteHundredths,
        }
      : point,
  )
}

/** Trends whose every line and total leave classified temporaries out at both ends of the range when some census in it has no FY figures for them. */
export function comparableTemps({ series, total }: Trends): Trends {
  return {
    series: series.map(({ key, points }) => ({
      key,
      points: comparablePoints(points),
    })),
    total: comparablePoints(total),
  }
}

/** How classified temporaries' FY figures are made, for the FY total pay reports' citation. */
const FY_PAY_METHOD = `Classified temporaries, whose published rates annualise hourly wages and overstate their pay, count by their actual pay in the fiscal year each Fall census falls in, from UO’s FY total pay reports: summed by the unit their published department name resolves to, through that census, the year’s budget, the censuses either side, or a reviewed list, and placed in that unit’s area. Their FTE is that pay over the average annual rate of the unit’s temporaries in the census, or its area’s, or UO’s, an estimate. Only temporaries count by actual pay; for other jobs, actual pay in these reports runs 3% to 12% above the rate × FTE estimate. Figures under ${MIN_JOBS_SHOWN} FY jobs are left out.`

/** The FY total pay reports for the given fiscal years, with how their figures are made; none for no year. */
export function fyPaySource(fiscalYears: number[]): SectionSource[] {
  if (fiscalYears.length === 0) return []
  return [
    {
      kind: 'fy-range',
      from: Math.min(...fiscalYears),
      to: Math.max(...fiscalYears),
      computed: FY_PAY_METHOD,
    },
  ]
}

/** The FY total pay reports the points' spend and FTE draw on; none when no point includes temporaries' FY figures. */
export function fySource(points: TrendPoint[]): SectionSource[] {
  return fyPaySource(points.flatMap(({ fyTemps }) => fyTemps?.fiscalYear ?? []))
}

/** The fiscal years, of those the given Fall censuses fall in, whose FY total pay reports the manifest lists. */
export function fyPayYears(
  manifest: Manifest,
  censusYears: number[],
): number[] {
  return manifest.fall.flatMap(({ year, censusDate }) => {
    const fiscalYear = fiscalYearOf(censusDate)
    return censusYears.includes(year) &&
      manifest.fy.some((entry) => entry.fiscalYear === fiscalYear)
      ? [fiscalYear]
      : []
  })
}
