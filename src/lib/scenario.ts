import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import type { OpeRates } from '../data/ope.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import {
  type EliminateRule,
  type EliminationResult,
  eliminationSavings,
} from './scenario-eliminate.ts'
import {
  type FreezeResult,
  type FreezeRule,
  freezeSavings,
} from './scenario-freeze.ts'
import {
  addCost,
  BASIS,
  BASIS_BIG,
  costOf,
  divideHalfUp,
  emptySavings,
  type Job,
  latestLeaveYear,
  type Rates,
  ratesFor,
  type Savings,
  type ScenarioScope,
  scopeJobs,
  toJobs,
} from './scenario-jobs.ts'
import {
  firstRaiseOf,
  payGrowth,
  type RaiseFreezeResult,
  type RaiseFreezeRule,
  type RaiseRate,
  raiseFreezeSavings,
} from './scenario-raises.ts'

export type {
  EliminateRule,
  EliminationResult,
} from './scenario-eliminate.ts'
export type { FreezeResult, FreezeRule } from './scenario-freeze.ts'
export { ANY_SCOPE, type Savings, type ScenarioScope } from './scenario-jobs.ts'
export type {
  RaiseFreezeResult,
  RaiseFreezeRule,
  RaiseRate,
} from './scenario-raises.ts'

export type Rule =
  | {
      kind: 'threshold'
      scope: ScenarioScope
      overCents: number
      cutBasisPoints: number
    }
  | { kind: 'remove'; scope: ScenarioScope }
  | { kind: 'cut'; scope: ScenarioScope; cutBasisPoints: number }
  | FreezeRule
  | EliminateRule
  | RaiseFreezeRule

type CensusRule = Exclude<Rule, FreezeRule | EliminateRule | RaiseFreezeRule>

/** What one rule did: a census rule's savings, a hiring or raise freeze's savings by projected year, or an elimination's budget lines. */
export type RuleResult =
  | { kind: 'census'; savings: Savings }
  | FreezeResult
  | EliminationResult
  | RaiseFreezeResult

/** The eliminations' budget lines summed, in the budget's fiscal year. */
export type EliminatedTotal = {
  egCents: number
  allFundsCents: number
  fiscalYear: number
}

export type ScenarioResult = {
  /** The census's jobs a scenario can change, and what they cost. */
  base: Savings
  rules: RuleResult[]
  /** The census rules' savings summed: the base less what remains before any freeze. */
  total: Savings
  /** The census rules' E&G savings in each projected year's pay, from each job's first-year raise. */
  censusEgByYear: number[]
  /** `null` when the scenario has no elimination. */
  eliminated: EliminatedTotal | null
  /** Classified temporaries left out of the base. */
  temporaries: number
  /** `null` when no OPE rate is published for the requested fiscal year. */
  opeFiscalYear: number | null
  leaveFiscalYear: number
}

export const SCENARIO_METHOD =
  'A scenario is an estimate over one Fall census, not a prediction. Its base is every job except classified temporaries, whose annualised hourly rates overstate pay. Rules apply in order, each to what the rules before it left: a removed job drops out of every later rule, and a cut rate is the rate later rules see, so no job is counted twice. A threshold compares the published full-time annual rate with the threshold and cuts only the part above it. Savings are gross: no revenue a change would lose is counted.'

function scaleRate(rateCents: number, keepBasisPoints: number): number {
  return Math.round((rateCents * keepBasisPoints) / BASIS)
}

/** The rate a job has after a rule, or `null` when the rule removes it. */
function rateAfter(rule: CensusRule, rateCents: number): number | null {
  switch (rule.kind) {
    case 'remove':
      return null
    case 'cut':
      return scaleRate(rateCents, BASIS - rule.cutBasisPoints)
    case 'threshold':
      return rateCents <= rule.overCents
        ? rateCents
        : rule.overCents +
            scaleRate(rateCents - rule.overCents, BASIS - rule.cutBasisPoints)
  }
}

function applyRule(
  rule: CensusRule,
  jobs: Job[],
  inScope: Set<FallRecord>,
  rates: Rates,
): Savings {
  const savings = emptySavings(rates)
  for (const job of jobs) {
    if (job.isRemoved || !inScope.has(job.record)) continue
    const rateCents = rateAfter(rule, job.rateCents)
    if (rateCents === job.rateCents) continue
    const before = costOf(job, rates)
    if (rateCents === null) job.isRemoved = true
    else job.rateCents = rateCents
    addCost(savings, before, 1)
    addCost(savings, costOf(job, rates), -1)
    savings.jobs += 1
  }
  return savings
}

function isCensusRule(rule: Rule): rule is CensusRule {
  return (
    rule.kind === 'threshold' || rule.kind === 'remove' || rule.kind === 'cut'
  )
}

function takeNext<T>(results: T[]): T {
  const result = results.shift()
  if (!result) throw new Error('A rule has no result')
  return result
}

function eliminatedTotal(
  budget: BudgetYear,
  results: EliminationResult[],
): EliminatedTotal | null {
  if (results.length === 0) return null
  return {
    egCents: results.reduce((sum, result) => sum + result.egCents, 0),
    allFundsCents: results.reduce(
      (sum, result) => sum + result.allFundsCents,
      0,
    ),
    fiscalYear: budget.fiscalYear,
  }
}

function sumSavings(parts: Savings[], rates: Rates): Savings {
  const total = emptySavings(rates)
  for (const part of parts) {
    total.jobs += part.jobs
    addCost(total, part, 1)
  }
  return total
}

/** The E&G each job's census rules saved, grown to each projected year's pay by its first-year raise and 3% a year after. */
function censusEgByYear(options: {
  census: DepartmentCensus
  jobs: Job[]
  egBefore: number[]
  rates: Rates
  raiseRates: RaiseRate[]
  projectedYears: number
}): number[] {
  const { jobs, projectedYears } = options
  const firstRaise = firstRaiseOf(options.census, options.raiseRates)
  const savedByRaise = new Map<number, bigint>()
  jobs.forEach((job, index) => {
    const saved =
      (options.egBefore[index] ?? 0) - costOf(job, options.rates).egCents
    if (saved === 0) return
    const first = firstRaise(job.record)
    savedByRaise.set(first, (savedByRaise.get(first) ?? 0n) + BigInt(saved))
  })
  const years = Array.from({ length: projectedYears }, () => 0)
  for (const [first, saved] of savedByRaise) {
    payGrowth(first, projectedYears).forEach((product, index) => {
      years[index] =
        (years[index] ?? 0) +
        Number(divideHalfUp(saved * product, BASIS_BIG ** BigInt(index + 1)))
    })
  }
  return years
}

/** Each hiring and raise freeze's savings, in stack order of each kind. */
function freezeResults(
  options: Parameters<typeof runScenario>[0],
  jobs: Job[],
  rates: Rates,
): { freezes: FreezeResult[]; raiseFreezes: RaiseFreezeResult[] } {
  const { census, rules, projectedYears } = options
  const freezeRules = rules.filter((rule) => rule.kind === 'freeze')
  const freezes = freezeSavings({
    census,
    history: options.history,
    jobs,
    freezes: freezeRules,
    rates,
    projectedYears,
  })
  const raiseFreezes = raiseFreezeSavings({
    census,
    jobs,
    raiseFreezes: rules.filter((rule) => rule.kind === 'raises'),
    freezes: freezeRules.map((rule, index) => ({
      rule,
      rateBasisPoints: freezes[index]?.rateBasisPoints ?? 0,
    })),
    rates,
    raiseRates: options.raiseRates,
    projectedYears,
  })
  return { freezes, raiseFreezes }
}

/**
 * Runs the rules over one census: eliminations first, from
 * `eliminationBudget`, then the census rules in order, then hiring freezes,
 * which take their rates from `history` and lay their savings over
 * `projectedYears`, then raise freezes at `raiseRates`.
 */
export function runScenario(options: {
  census: DepartmentCensus
  rules: Rule[]
  rates: OpeRates
  egShares: Map<string, number>
  opeFiscalYear: number
  history: DepartmentCensus[]
  projectedYears: number
  eliminationBudget: BudgetYear
  raiseRates: RaiseRate[]
}): ScenarioResult {
  const { census, rules, rates, egShares, opeFiscalYear } = options
  const yearRates = ratesFor(rates, opeFiscalYear)
  const jobs = toJobs(census, egShares)
  const base = emptySavings(yearRates)
  for (const job of jobs) addCost(base, costOf(job, yearRates), 1)
  base.jobs = jobs.length
  const eliminations = eliminationSavings({
    census,
    jobs,
    budget: options.eliminationBudget,
    eliminations: rules.filter((rule) => rule.kind === 'eliminate'),
  })
  const eliminated = eliminatedTotal(options.eliminationBudget, eliminations)
  const egBefore = jobs.map((job) => costOf(job, yearRates).egCents)
  const censusResults = rules
    .filter(isCensusRule)
    .map((rule) =>
      applyRule(rule, jobs, scopeJobs(census, rule.scope), yearRates),
    )
  const { freezes, raiseFreezes } = freezeResults(options, jobs, yearRates)
  const queues = {
    census: censusResults.map((savings) => ({
      kind: 'census' as const,
      savings,
    })),
    freeze: freezes,
    raises: raiseFreezes,
    eliminate: eliminations,
  }
  return {
    base,
    rules: rules.map((rule) =>
      takeNext<RuleResult>(queues[isCensusRule(rule) ? 'census' : rule.kind]),
    ),
    total: sumSavings(censusResults, yearRates),
    censusEgByYear: censusEgByYear({
      census,
      jobs,
      egBefore,
      rates: yearRates,
      raiseRates: options.raiseRates,
      projectedYears: options.projectedYears,
    }),
    eliminated,
    temporaries: census.records.length - jobs.length,
    opeFiscalYear: yearRates ? opeFiscalYear : null,
    leaveFiscalYear: latestLeaveYear(rates),
  }
}
