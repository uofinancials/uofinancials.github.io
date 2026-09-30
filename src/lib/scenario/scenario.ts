import type { BudgetYear } from '../../data/budget.ts'
import type { FyTempsUnit } from '../../data/fy-temps.ts'
import type { OpeRates } from '../../data/ope.ts'
import type { DepartmentCensus } from '../departments/jobs.ts'
import type { SectionSource } from '../shared/citation.ts'
import { fyPaySource } from '../trends/trends.ts'
import {
  type EliminateRule,
  type EliminationResult,
  eliminationSavings,
} from './eliminate.ts'
import { type FreezeResult, type FreezeRule, freezeSavings } from './freeze.ts'
import {
  addCost,
  BASIS,
  costOf,
  emptySavings,
  growCents,
  type Job,
  jobCount,
  latestLeaveYear,
  type Rates,
  ratesFor,
  type Savings,
  type ScenarioScope,
  scopeReach,
  toJobs,
} from './jobs.ts'
import {
  payGrowthOf,
  type RaiseFreezeResult,
  type RaiseFreezeRule,
  type RaiseRate,
  raiseFreezeSavings,
} from './raises.ts'

export type {
  EliminateRule,
  EliminationResult,
} from './eliminate.ts'
export type { FreezeResult, FreezeRule } from './freeze.ts'
export { ANY_SCOPE, type Savings, type ScenarioScope } from './jobs.ts'
export type {
  RaiseFreezeResult,
  RaiseFreezeRule,
  RaiseRate,
} from './raises.ts'

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
  /** The classified temporaries' FY jobs and pay in the base; `null` when the census's fiscal year publishes no pay. */
  temps: { jobs: number; payCents: number } | null
  /** `null` when no OPE rate is published for the requested fiscal year. */
  opeFiscalYear: number | null
  leaveFiscalYear: number
}

export const SCENARIO_METHOD =
  "A scenario is an estimate over one Fall census, not a prediction. Its base is every job, with classified temporaries counted not at their annualised hourly rates, which overstate pay, but at their actual pay in the fiscal year the census falls in, from the FY total pay reports, summed by the unit their department resolves to and placed in its area; until that year's pay is published, they are left out. Rules apply in order, each to what the rules before it left: a removed job drops out of every later rule, and a cut rate is the rate later rules see, so no job is counted twice. A threshold compares the published full-time annual rate with the threshold and cuts only the part above it, so it never reaches temporaries, whose pay has no rate. Other rules reach a unit's temporaries when their scope names no term or position and admits their group, staff kind, and unit or area; their jobs are counted as the reports list them. Savings are gross: no revenue a change would lose is counted."

const TEMPS_COMPUTED =
  "Classified temporaries' actual pay in the fiscal year, summed by unit; scenarios count it in place of their annualised rates, as the method says."

/** The FY total pay reports a scenario's classified temporaries come from, with how scenarios count them. */
export function scenarioTempsSources(fiscalYears: number[]): SectionSource[] {
  return fyPaySource(fiscalYears).map((source) => ({
    ...source,
    computed: TEMPS_COMPUTED,
  }))
}

function scaleRate(rateCents: number, keepBasisPoints: number): number {
  return Math.round((rateCents * keepBasisPoints) / BASIS)
}

/** The rate a job has after a rule, or `null` when the rule removes it; a threshold leaves temporaries' pay, which has no rate to compare. */
function rateAfter(rule: CensusRule, job: Job): number | null {
  const { rateCents } = job
  switch (rule.kind) {
    case 'remove':
      return null
    case 'cut':
      return scaleRate(rateCents, BASIS - rule.cutBasisPoints)
    case 'threshold':
      return job.kind === 'temps' || rateCents <= rule.overCents
        ? rateCents
        : rule.overCents +
            scaleRate(rateCents - rule.overCents, BASIS - rule.cutBasisPoints)
  }
}

/** Applies one census rule, adding each changed job's E&G saving to `savedEg`. */
function applyRule(
  rule: CensusRule,
  jobs: Job[],
  reaches: (job: Job) => boolean,
  rates: Rates,
  savedEg: Map<Job, number>,
): Savings {
  const savings = emptySavings(rates)
  for (const job of jobs) {
    if (job.isRemoved || !reaches(job)) continue
    const rateCents = rateAfter(rule, job)
    if (rateCents === job.rateCents) continue
    const before = costOf(job, rates)
    if (rateCents === null) job.isRemoved = true
    else job.rateCents = rateCents
    const after = costOf(job, rates)
    addCost(savings, before, 1)
    addCost(savings, after, -1)
    savings.jobs += jobCount(job)
    savedEg.set(job, (savedEg.get(job) ?? 0) + before.egCents - after.egCents)
  }
  return savings
}

function isCensusRule(rule: Rule): rule is CensusRule {
  return (
    rule.kind === 'threshold' || rule.kind === 'remove' || rule.kind === 'cut'
  )
}

/** The stages a scenario runs its rules in, in run order, whatever their order in the stack. */
export const RULE_STAGES = ['eliminate', 'census', 'freeze', 'raises'] as const
export type RuleStage = (typeof RULE_STAGES)[number]

export function stageOf(rule: Rule): RuleStage {
  return isCensusRule(rule) ? 'census' : rule.kind
}

export const stageRank = (rule: Rule) => RULE_STAGES.indexOf(stageOf(rule))

/** The rules in stage order, keeping their order within each stage. */
export function sortByStage(rules: Rule[]): Rule[] {
  return rules.toSorted((a, b) => stageRank(a) - stageRank(b))
}

/** Whether a rule's savings grow by the first-year raise rates: every rule but an elimination, which grows from its budget lines. */
export function usesRaiseRates(rule: Rule): boolean {
  return isCensusRule(rule) || rule.kind === 'freeze' || rule.kind === 'raises'
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

/** Each job's E&G saving grown to each projected year's pay, summed per growth path and rounded once per path and year. */
function censusEgByYear(
  savedEg: Map<Job, number>,
  payGrowthOf: (job: Job) => bigint[],
  projectedYears: number,
): number[] {
  const savedByPath = new Map<bigint[], number>()
  for (const [job, saved] of savedEg) {
    const path = payGrowthOf(job)
    savedByPath.set(path, (savedByPath.get(path) ?? 0) + saved)
  }
  const years = Array.from({ length: projectedYears }, () => 0)
  for (const [path, saved] of savedByPath) {
    path.forEach((product, index) => {
      years[index] = (years[index] ?? 0) + growCents(saved, product, index + 1)
    })
  }
  return years
}

/** Applies the census rules in order: each rule's savings, and their E&G in each projected year's pay. */
function applyCensusRules(
  options: Parameters<typeof runScenario>[0],
  jobs: Job[],
  rates: Rates,
  payGrowthOf: (job: Job) => bigint[],
): { results: Savings[]; egByYear: number[] } {
  const savedEg = new Map<Job, number>()
  const results = options.rules
    .filter(isCensusRule)
    .map((rule) =>
      applyRule(
        rule,
        jobs,
        scopeReach(options.census, rule.scope),
        rates,
        savedEg,
      ),
    )
  return {
    results,
    egByYear: censusEgByYear(savedEg, payGrowthOf, options.projectedYears),
  }
}

/** Each hiring and raise freeze's savings, in stack order of each kind. */
function freezeResults(
  options: Parameters<typeof runScenario>[0],
  jobs: Job[],
  rates: Rates,
  payGrowthOf: (job: Job) => bigint[],
): { freezes: FreezeResult[]; raiseFreezes: RaiseFreezeResult[] } {
  const { census, rules, projectedYears } = options
  const { results: freezes, filled } = freezeSavings({
    census,
    history: options.history,
    jobs,
    freezes: rules.filter((rule) => rule.kind === 'freeze'),
    rates,
    projectedYears,
    payGrowthOf,
  })
  const raiseFreezes = raiseFreezeSavings({
    census,
    jobs,
    raiseFreezes: rules.filter((rule) => rule.kind === 'raises'),
    filled,
    rates,
    raiseRates: options.raiseRates,
    projectedYears,
  })
  return { freezes, raiseFreezes }
}

function tempsOf(temps: FyTempsUnit[]): ScenarioResult['temps'] {
  if (temps.length === 0) return null
  return {
    jobs: temps.reduce((sum, unit) => sum + unit.jobs, 0),
    payCents: temps.reduce((sum, unit) => sum + unit.payCents, 0),
  }
}

/**
 * Runs the rules over one census, with its classified temporaries as `temps`,
 * their FY pay by unit: eliminations first, from
 * `eliminationBudget`, then the census rules in order, then hiring freezes,
 * which take their rates from `history` and lay their savings over
 * `projectedYears`, then raise freezes at `raiseRates`.
 */
export function runScenario(options: {
  census: DepartmentCensus
  temps: FyTempsUnit[]
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
  const jobs = toJobs(census, egShares, options.temps)
  const base = emptySavings(yearRates)
  for (const job of jobs) {
    addCost(base, costOf(job, yearRates), 1)
    base.jobs += jobCount(job)
  }
  const eliminations = eliminationSavings({
    census,
    jobs,
    budget: options.eliminationBudget,
    eliminations: rules.filter((rule) => rule.kind === 'eliminate'),
  })
  const eliminated = eliminatedTotal(options.eliminationBudget, eliminations)
  const payGrowth = payGrowthOf(
    census,
    options.raiseRates,
    options.projectedYears,
  )
  const censusRules = applyCensusRules(options, jobs, yearRates, payGrowth)
  const { freezes, raiseFreezes } = freezeResults(
    options,
    jobs,
    yearRates,
    payGrowth,
  )
  const queues = {
    census: censusRules.results.map((savings) => ({
      kind: 'census' as const,
      savings,
    })),
    freeze: freezes,
    raises: raiseFreezes,
    eliminate: eliminations,
  }
  return {
    base,
    rules: rules.map((rule) => takeNext<RuleResult>(queues[stageOf(rule)])),
    total: sumSavings(censusRules.results, yearRates),
    censusEgByYear: censusRules.egByYear,
    eliminated,
    temps: tempsOf(options.temps),
    opeFiscalYear: yearRates ? opeFiscalYear : null,
    leaveFiscalYear: latestLeaveYear(rates),
  }
}
