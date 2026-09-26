import type { FallRecord } from '../data/fall.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { isClassifiedTemp, jobSpendCents } from './overview.ts'
import {
  addCost,
  BASIS,
  costOf,
  emptySavings,
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
  "A hiring freeze is this site's estimate from past turnover, not a list of jobs. Its rate is the share of the scope's salary spend held by names that appear in one Fall census and in none of the next, averaged over the censuses given; that counts retirements, resignations, non-renewals, and name changes alike. In each year of the freeze, that share of the scope compounds: 1 - (1 - rate)^years. When it ends, positions are refilled at the departing jobs' pay, or stay eliminated, as the rule says. Each year of the freeze counts in full, as if it began on the first day of the fiscal year. No exceptions are assumed. A freeze applies after every other rule, to the jobs and rates they left; freezes over the same jobs apply in order."

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

function scaleCost(cost: JobCost, shareBasisPoints: number): JobCost {
  const scale = (cents: number) =>
    Math.round((cents * shareBasisPoints) / BASIS)
  return {
    salaryCents: scale(cost.salaryCents),
    fullCostCents:
      cost.fullCostCents === null ? null : scale(cost.fullCostCents),
    egCents: scale(cost.egCents),
  }
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

/** One freeze's scope and, per projected year, its share and what it has saved so far; `jobs` accumulates fractional positions. */
type Tracker = {
  rateBasisPoints: number
  scope: Set<FallRecord>
  years: { share: number; savings: Savings }[]
}

/** Adds one job's savings to each freeze covering it, each year, each freeze on what the earlier ones left. */
function saveJob(cost: JobCost, covering: Tracker[]): void {
  const left = new Map<number, JobCost>()
  const held = new Map<number, number>()
  for (const tracker of covering) {
    tracker.years.forEach(({ share, savings }, year) => {
      const cents = left.get(year) ?? cost
      const fraction = held.get(year) ?? 1
      const saved = scaleCost(cents, share)
      addCost(savings, saved, 1)
      savings.jobs += (fraction * share) / BASIS
      left.set(year, subtractCost(cents, saved))
      held.set(year, fraction * (1 - share / BASIS))
    })
  }
}

/** Each freeze's savings per projected year, in stack order, over the jobs and rates every other rule left. */
export function freezeSavings(options: {
  census: DepartmentCensus
  history: DepartmentCensus[]
  jobs: Job[]
  freezes: FreezeRule[]
  rates: Rates
  projectedYears: number
}): FreezeResult[] {
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
    if (covering.length > 0) saveJob(costOf(job, rates), covering)
  }
  return trackers.map(({ rateBasisPoints, years }) => ({
    kind: 'freeze',
    rateBasisPoints,
    byYear: years.map(({ savings }) => ({
      ...savings,
      jobs: Math.round(savings.jobs),
    })),
  }))
}
