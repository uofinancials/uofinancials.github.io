import type { FallRecord } from '../data/fall.ts'
import type { Manifest } from '../data/manifest.ts'
import type { OpeRates } from '../data/ope.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import {
  fiscalYearForCensus,
  fiscalYearOf,
  isClassifiedTemp,
  jobSpendCents,
} from './overview.ts'
import {
  addCost,
  BASIS,
  costOf,
  emptySavings,
  growCents,
  type Job,
  type JobCost,
  type Rates,
  type Savings,
  type ScenarioScope,
  scopeJobs,
} from './scenario-jobs.ts'

export type FreezeRule = {
  kind: 'freeze'
  scope: ScenarioScope
  /** Fiscal years the freeze lasts, from the first year after the census. */
  years: number
  afterFreeze: 'refill' | 'eliminate'
}

export type FreezeResult = {
  kind: 'freeze'
  rateBasisPoints: number
  /** One per projected year: what the freeze saves, with `jobs` the positions it leaves empty, rounded. */
  byYear: Savings[]
}

export const FREEZE_METHOD =
  "A hiring freeze is this site's estimate from past turnover, not a list of jobs. Its rate is the share of the scope's salary spend held by names that appear in one Fall census and in none of the next, averaged over the censuses given; that counts retirements, resignations, non-renewals, and name changes alike. In each year of the freeze, that share of the scope compounds: 1 - (1 - rate)^years. When it ends, positions are refilled at the departing jobs' pay, or stay eliminated, as the rule says. Each year of the freeze counts in full, as if it began on the first day of the fiscal year. No exceptions are assumed. Savings are in each year's pay, grown as the outlook grows census-rule savings. A freeze applies after every other rule, to the jobs and rates they left; freezes over the same jobs apply in order."

/**
 * The censuses a freeze's turnover is averaged over, in census order: each
 * one in a fiscal year with a published OPE rate, with the budget year that
 * places its areas.
 */
export function freezeHistoryCensuses(
  manifest: Manifest,
  rates: OpeRates,
): { year: number; fiscalYear: number }[] {
  const firstOpeYear = Math.min(
    ...rates.opeRates.map((rate) => rate.fiscalYear),
  )
  return manifest.fall
    .filter(({ censusDate }) => fiscalYearOf(censusDate) >= firstOpeYear)
    .sort((a, b) => a.year - b.year)
    .map(({ year, censusDate }) => ({
      year,
      fiscalYear: fiscalYearForCensus(manifest, censusDate),
    }))
}

/** The share of a scope's spend, in basis points, whose names leave between consecutive censuses; `null` with no spend. */
function departedBasisPoints(
  from: DepartmentCensus,
  to: DepartmentCensus,
  scope: ScenarioScope,
): number | null {
  const stayed = new Set(to.records.map((record) => record.name))
  let startCents = 0
  let departedCents = 0
  for (const record of scopeJobs(from, scope)) {
    if (isClassifiedTemp(record)) continue
    const cents = jobSpendCents(record)
    startCents += cents
    if (!stayed.has(record.name)) departedCents += cents
  }
  return startCents > 0 ? (departedCents * BASIS) / startCents : null
}

/** The mean departed share over each consecutive pair in `history`, in whole basis points. */
export function departureRate(
  history: DepartmentCensus[],
  scope: ScenarioScope,
): number {
  const rates = history
    .slice(1)
    .flatMap((to, index) => {
      const from = history[index]
      return from ? [departedBasisPoints(from, to, scope)] : []
    })
    .filter((rate) => rate !== null)
  if (rates.length === 0) return 0
  return Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length)
}

/** The share of a scope a freeze leaves empty in projected year `year` (1 is the first), in basis points. */
export function freezeShare(
  rule: FreezeRule,
  rateBasisPoints: number,
  year: number,
): number {
  const lastYear = rule.afterFreeze === 'eliminate' ? rule.years : 0
  const heldYears = year <= rule.years ? year : lastYear
  return Math.round(BASIS * (1 - (1 - rateBasisPoints / BASIS) ** heldYears))
}

function mapCost(cost: JobCost, map: (cents: number) => number): JobCost {
  return {
    salaryCents: map(cost.salaryCents),
    fullCostCents: cost.fullCostCents === null ? null : map(cost.fullCostCents),
    egCents: map(cost.egCents),
  }
}

function scaleCost(cost: JobCost, shareBasisPoints: number): JobCost {
  return mapCost(cost, (cents) =>
    Math.round((cents * shareBasisPoints) / BASIS),
  )
}

function subtractCost(cost: JobCost, part: JobCost): JobCost {
  return {
    salaryCents: cost.salaryCents - part.salaryCents,
    fullCostCents:
      cost.fullCostCents === null || part.fullCostCents === null
        ? null
        : cost.fullCostCents - part.fullCostCents,
    egCents: cost.egCents - part.egCents,
  }
}

/** A hiring freeze's scope and the share of it kept filled each projected year. */
export type FilledFreeze = { scope: Set<FallRecord>; kept: number[] }

/** One freeze's scope and, per projected year, its share and what it has saved so far; `jobs` accumulates fractional positions. */
type Tracker = {
  rateBasisPoints: number
  scope: Set<FallRecord>
  years: { share: number; savings: Savings }[]
}

/** Adds one job's savings in each year's pay to each freeze covering it, each freeze on what the earlier ones left. */
function saveJob(yearCosts: JobCost[], covering: Tracker[]): void {
  yearCosts.forEach((yearCost, year) => {
    let left = yearCost
    let held = 1
    for (const tracker of covering) {
      const entry = tracker.years[year]
      if (!entry) continue
      const saved = scaleCost(left, entry.share)
      addCost(entry.savings, saved, 1)
      entry.savings.jobs += (held * entry.share) / BASIS
      left = subtractCost(left, saved)
      held *= 1 - entry.share / BASIS
    }
  })
}

/** Each freeze's savings per projected year in that year's pay, in stack order, over the jobs and rates every other rule left, and the share of each scope it keeps filled. */
export function freezeSavings(options: {
  census: DepartmentCensus
  history: DepartmentCensus[]
  jobs: Job[]
  freezes: FreezeRule[]
  rates: Rates
  projectedYears: number
  /** Each projected year's pay over a job's census pay, scaled by `BASIS` to the power of the year. */
  payGrowthOf: (record: FallRecord) => bigint[]
}): { results: FreezeResult[]; filled: FilledFreeze[] } {
  const { census, history, jobs, rates, projectedYears } = options
  const trackers: Tracker[] = options.freezes.map((freeze) => {
    const rateBasisPoints = departureRate(history, freeze.scope)
    return {
      rateBasisPoints,
      scope: scopeJobs(census, freeze.scope),
      years: Array.from({ length: projectedYears }, (_, index) => ({
        share: freezeShare(freeze, rateBasisPoints, index + 1),
        savings: emptySavings(rates),
      })),
    }
  })
  for (const job of jobs) {
    if (job.isRemoved) continue
    const covering = trackers.filter(({ scope }) => scope.has(job.record))
    if (covering.length === 0) continue
    const cost = costOf(job, rates)
    saveJob(
      options
        .payGrowthOf(job.record)
        .map((product, index) =>
          mapCost(cost, (cents) => growCents(cents, product, index + 1)),
        ),
      covering,
    )
  }
  return {
    results: trackers.map(({ rateBasisPoints, years }) => ({
      kind: 'freeze',
      rateBasisPoints,
      byYear: years.map(({ savings }) => ({
        ...savings,
        jobs: Math.round(savings.jobs),
      })),
    })),
    filled: trackers.map(({ scope, years }) => ({
      scope,
      kept: years.map(({ share }) => 1 - share / BASIS),
    })),
  }
}
