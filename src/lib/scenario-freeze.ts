import type { DepartmentCensus } from './department-jobs.ts'
import { isClassifiedTemp, jobSpendCents } from './overview.ts'
import {
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

export type FreezeSavings = {
  /** The freeze's place in the rule stack. */
  rule: number
  rateBasisPoints: number
  /** One per projected year: what the freeze saves, with `jobs` the positions it leaves empty, rounded. */
  byYear: Savings[]
}

export const FREEZE_METHOD =
  "A hiring freeze is this site's estimate from past turnover, not a list of jobs. Its rate is the share of the scope's salary spend held by names that appear in one Fall census and in none of the next, averaged over the censuses given; that counts retirements, resignations, non-renewals, and name changes alike. In each year of the freeze, that share of the scope compounds: 1 - (1 - rate)^years. When it ends, positions are refilled at the departing jobs' pay, or stay eliminated, as the rule says. No exceptions are assumed. A freeze applies after every other rule, to the jobs and rates they left; freezes over the same jobs apply in order."

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

type Freeze = { rule: number; freeze: FreezeRule; rateBasisPoints: number }

function addTo(savings: Savings, cost: JobCost) {
  savings.salaryCents += cost.salaryCents
  savings.egCents += cost.egCents
  if (savings.fullCostCents !== null && cost.fullCostCents !== null) {
    savings.fullCostCents += cost.fullCostCents
  }
}

function saveYear(options: {
  census: DepartmentCensus
  jobs: Job[]
  freezes: Freeze[]
  rates: Rates
  year: number
}): Savings[] {
  const { census, jobs, freezes, rates, year } = options
  const scopes = freezes.map(({ freeze }) => scopeJobs(census, freeze.scope))
  const savings = freezes.map(() => emptySavings(rates))
  const positions = freezes.map(() => 0)
  for (const job of jobs) {
    if (job.isRemoved) continue
    let left = costOf(job, job.rateCents, rates)
    let heldFraction = 1
    freezes.forEach(({ freeze, rateBasisPoints }, index) => {
      if (!scopes[index]?.has(job.record)) return
      const share = freezeShare(freeze, rateBasisPoints, year)
      const saved = scaleCost(left, share)
      left = subtractCost(left, saved)
      const target = savings[index]
      if (target) addTo(target, saved)
      positions[index] =
        (positions[index] ?? 0) + (heldFraction * share) / BASIS
      heldFraction *= 1 - share / BASIS
    })
  }
  return savings.map((saving, index) => ({
    ...saving,
    jobs: Math.round(positions[index] ?? 0),
  }))
}

/** Each freeze's savings per projected year, over the jobs and rates every other rule left. */
export function freezeSavings(options: {
  census: DepartmentCensus
  history: DepartmentCensus[]
  jobs: Job[]
  freezes: { rule: number; freeze: FreezeRule }[]
  rates: Rates
  projectedYears: number
}): FreezeSavings[] {
  const { census, history, jobs, rates, projectedYears } = options
  const freezes = options.freezes.map((entry) => ({
    ...entry,
    rateBasisPoints: departureRate(history, entry.freeze.scope),
  }))
  const byYear = Array.from({ length: projectedYears }, (_, index) =>
    saveYear({ census, jobs, freezes, rates, year: index + 1 }),
  )
  return freezes.map(({ rule, rateBasisPoints }, index) => ({
    rule,
    rateBasisPoints,
    byYear: byYear.map((year) => year[index] ?? emptySavings(rates)),
  }))
}
