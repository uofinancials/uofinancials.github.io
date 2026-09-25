import type { FallRecord } from '../data/fall.ts'
import type { OpeRates } from '../data/ope.ts'
import { placeJobs } from './census-search.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { egShareOf } from './eg-share.ts'
import { type OpeGroupRef, opeGroupOf } from './ope-groups.ts'
import { isClassifiedTemp, jobSpendCents } from './overview.ts'
import { filterJobs, type JobFilter } from './salary-distribution.ts'
import { trendGroupOf } from './trend-groups.ts'

/** Which jobs a rule reaches: the /people filters. */
export type ScenarioScope = JobFilter & { dept: string | null }

export type Rule =
  | {
      kind: 'threshold'
      scope: ScenarioScope
      overCents: number
      cutBasisPoints: number
    }
  | { kind: 'remove'; scope: ScenarioScope }
  | { kind: 'cut'; scope: ScenarioScope; cutBasisPoints: number }

export type Savings = {
  jobs: number
  salaryCents: number
  /** `null` when no OPE rate is published for the fiscal year used. */
  fullCostCents: number | null
  /** Full cost, or salary where it is `null`, weighted by each job's E&G share. */
  egCents: number
}

export type ScenarioResult = {
  /** The census's jobs a scenario can change, and what they cost. */
  base: Savings
  /** One per rule, in order: the jobs it changed and what it saved. */
  rules: Savings[]
  /** The sum of `rules`: the base less what remains. */
  total: Savings
  /** Classified temporaries left out of the base. */
  temporaries: number
  /** `null` when no OPE rate is published for the requested fiscal year. */
  opeFiscalYear: number | null
  leaveFiscalYear: number
}

const BASIS = 10_000
const BASIS_BIG = 10_000n

export const SCENARIO_METHOD =
  'A scenario is an estimate over one Fall census, not a prediction. Its base is every job except classified temporaries, whose annualised hourly rates overstate pay. Rules apply in order, each to what the rules before it left: a removed job drops out of every later rule, and a cut rate is the rate later rules see, so no job is counted twice. A threshold compares the published full-time annual rate with the threshold and cuts only the part above it. Savings are gross: no revenue a change would lose is counted.'

export const FULL_COST_METHOD =
  "Full cost is salary x (1 - leave rate) x (1 + OPE rate), following BRP's rate guidance, with each job's OPE rate group estimated by this site. It uses the OPE rate for the fiscal year stated and the latest published leave rate. The PERS side-account charge is left out, because the census does not say which fund pays a job. Overloads are costed at salary, with no OPE."

type Job = {
  record: FallRecord
  rateCents: number
  isRemoved: boolean
  group: OpeGroupRef | null
  shareBasisPoints: number
}

type JobCost = {
  salaryCents: number
  fullCostCents: number | null
  egCents: number
}

type Rates = { ope: Map<string, number>; leave: Map<string, number> } | null

function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n)
}

function leaveKey(group: string, appliesTo: string | null): string {
  return `${group}|${appliesTo ?? ''}`
}

function latestLeaveYear(rates: OpeRates): number {
  return Math.max(...rates.leaveRates.map((rate) => rate.fiscalYear))
}

function ratesFor(rates: OpeRates, opeFiscalYear: number): Rates {
  const ope = rates.opeRates.filter((rate) => rate.fiscalYear === opeFiscalYear)
  if (ope.length === 0) return null
  const leaveYear = latestLeaveYear(rates)
  return {
    ope: new Map(ope.map((rate) => [rate.group, rate.basisPoints])),
    leave: new Map(
      rates.leaveRates
        .filter((rate) => rate.fiscalYear === leaveYear)
        .map((rate) => [
          leaveKey(rate.group, rate.appliesTo),
          rate.basisPoints,
        ]),
    ),
  }
}

function fullCostOf(
  salaryCents: number,
  group: OpeGroupRef | null,
  rates: Rates,
) {
  if (!rates) return null
  if (!group) return salaryCents
  const ope = rates.ope.get(group.group)
  const leave = rates.leave.get(leaveKey(group.group, group.leave))
  if (ope === undefined || leave === undefined) {
    throw new Error(
      `No OPE or leave rate for ${group.group} ${group.leave ?? ''}`.trim(),
    )
  }
  const product =
    BigInt(salaryCents) *
    (BASIS_BIG - BigInt(leave)) *
    (BASIS_BIG + BigInt(ope))
  return Number(divideHalfUp(product, BASIS_BIG * BASIS_BIG))
}

function costOf(job: Job, rateCents: number, rates: Rates): JobCost {
  if (job.isRemoved)
    return { salaryCents: 0, fullCostCents: rates ? 0 : null, egCents: 0 }
  const salaryCents = jobSpendCents({
    ...job.record,
    annualSalaryRateCents: rateCents,
  })
  const fullCostCents = fullCostOf(salaryCents, job.group, rates)
  const egCents = Number(
    divideHalfUp(
      BigInt(fullCostCents ?? salaryCents) * BigInt(job.shareBasisPoints),
      BASIS_BIG,
    ),
  )
  return { salaryCents, fullCostCents, egCents }
}

function emptySavings(rates: Rates): Savings {
  return {
    jobs: 0,
    salaryCents: 0,
    fullCostCents: rates ? 0 : null,
    egCents: 0,
  }
}

function addCost(savings: Savings, cost: JobCost, sign: 1 | -1): void {
  savings.salaryCents += sign * cost.salaryCents
  savings.egCents += sign * cost.egCents
  if (savings.fullCostCents !== null && cost.fullCostCents !== null) {
    savings.fullCostCents += sign * cost.fullCostCents
  }
}

function scaleRate(rateCents: number, keepBasisPoints: number): number {
  return Math.round((rateCents * keepBasisPoints) / BASIS)
}

/** The rate a job has after a rule, or `null` when the rule removes it. */
function rateAfter(rule: Rule, rateCents: number): number | null {
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

export function scopeJobs(
  census: DepartmentCensus,
  scope: ScenarioScope,
): Set<FallRecord> {
  return new Set(filterJobs(placeJobs(census, scope.dept), scope, census.year))
}

function applyRule(
  rule: Rule,
  jobs: Job[],
  inScope: Set<FallRecord>,
  rates: Rates,
): Savings {
  const savings = emptySavings(rates)
  for (const job of jobs) {
    if (job.isRemoved || !inScope.has(job.record)) continue
    const before = costOf(job, job.rateCents, rates)
    const rateCents = rateAfter(rule, job.rateCents)
    if (rateCents === job.rateCents) continue
    if (rateCents === null) job.isRemoved = true
    else job.rateCents = rateCents
    addCost(savings, before, 1)
    addCost(savings, costOf(job, job.rateCents, rates), -1)
    savings.jobs += 1
  }
  return savings
}

function toJobs(census: DepartmentCensus, shares: Map<string, number>): Job[] {
  return census.records
    .filter((record) => !isClassifiedTemp(record))
    .map((record) => ({
      record,
      rateCents: record.annualSalaryRateCents,
      isRemoved: false,
      group: opeGroupOf(record, trendGroupOf(record, census.year), census.year),
      shareBasisPoints: egShareOf(record, census, shares),
    }))
}

function sumSavings(parts: Savings[], rates: Rates): Savings {
  const total = emptySavings(rates)
  for (const part of parts) {
    total.jobs += part.jobs
    addCost(total, part, 1)
  }
  return total
}

/** Runs the rules in order over one census; `opeFiscalYear` picks the OPE rates, usually the fiscal year the census falls in. */
export function runScenario(options: {
  census: DepartmentCensus
  rules: Rule[]
  rates: OpeRates
  egShares: Map<string, number>
  opeFiscalYear: number
}): ScenarioResult {
  const { census, rules, rates, egShares, opeFiscalYear } = options
  const yearRates = ratesFor(rates, opeFiscalYear)
  const jobs = toJobs(census, egShares)
  const base = emptySavings(yearRates)
  for (const job of jobs)
    addCost(base, costOf(job, job.rateCents, yearRates), 1)
  base.jobs = jobs.length
  const ruleSavings = rules.map((rule) =>
    applyRule(rule, jobs, scopeJobs(census, rule.scope), yearRates),
  )
  return {
    base,
    rules: ruleSavings,
    total: sumSavings(ruleSavings, yearRates),
    temporaries: census.records.length - jobs.length,
    opeFiscalYear: yearRates ? opeFiscalYear : null,
    leaveFiscalYear: latestLeaveYear(rates),
  }
}
