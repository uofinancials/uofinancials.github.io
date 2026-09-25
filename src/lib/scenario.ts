import type { FallRecord } from '../data/fall.ts'
import type { OpeRates } from '../data/ope.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import {
  type FreezeResult,
  type FreezeRule,
  freezeSavings,
} from './scenario-freeze.ts'
import {
  addCost,
  BASIS,
  costOf,
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

export type { FreezeResult, FreezeRule } from './scenario-freeze.ts'
export type { Savings, ScenarioScope } from './scenario-jobs.ts'

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

type CensusRule = Exclude<Rule, FreezeRule>

/** What one rule did: a census rule's savings, or a freeze's savings by projected year. */
export type RuleResult = { kind: 'census'; savings: Savings } | FreezeResult

export type ScenarioResult = {
  /** The census's jobs a scenario can change, and what they cost. */
  base: Savings
  /** One per rule, in order. */
  rules: RuleResult[]
  /** The census rules' savings summed: the base less what remains before any freeze. */
  total: Savings
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

function nextFreeze(results: FreezeResult[]): FreezeResult {
  const result = results.shift()
  if (!result) throw new Error('A freeze rule has no freeze result')
  return result
}

function sumSavings(parts: Savings[], rates: Rates): Savings {
  const total = emptySavings(rates)
  for (const part of parts) {
    total.jobs += part.jobs
    addCost(total, part, 1)
  }
  return total
}

/**
 * Runs the rules in order over one census. `opeFiscalYear` picks the OPE
 * rates, usually the fiscal year the census falls in; freezes take their rates
 * from `history` and lay their savings over `projectedYears`.
 */
export function runScenario(options: {
  census: DepartmentCensus
  rules: Rule[]
  rates: OpeRates
  egShares: Map<string, number>
  opeFiscalYear: number
  history: DepartmentCensus[]
  projectedYears: number
}): ScenarioResult {
  const { census, rules, rates, egShares, opeFiscalYear } = options
  const yearRates = ratesFor(rates, opeFiscalYear)
  const jobs = toJobs(census, egShares)
  const base = emptySavings(yearRates)
  for (const job of jobs) addCost(base, costOf(job, yearRates), 1)
  base.jobs = jobs.length
  const censusResults = rules.map((rule) =>
    rule.kind === 'freeze'
      ? null
      : applyRule(rule, jobs, scopeJobs(census, rule.scope), yearRates),
  )
  const freezeResults = freezeSavings({
    census,
    history: options.history,
    jobs,
    freezes: rules.filter((rule) => rule.kind === 'freeze'),
    rates: yearRates,
    projectedYears: options.projectedYears,
  })
  return {
    base,
    rules: censusResults.map((savings) =>
      savings ? { kind: 'census', savings } : nextFreeze(freezeResults),
    ),
    total: sumSavings(
      censusResults.filter((savings) => savings !== null),
      yearRates,
    ),
    temporaries: census.records.length - jobs.length,
    opeFiscalYear: yearRates ? opeFiscalYear : null,
    leaveFiscalYear: latestLeaveYear(rates),
  }
}
