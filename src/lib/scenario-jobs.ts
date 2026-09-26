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

export const ANY_SCOPE: ScenarioScope = {
  group: null,
  kind: 'all',
  term: null,
  position: null,
  dept: null,
}

export type Savings = {
  jobs: number
  salaryCents: number
  /** `null` when no OPE rate is published for the fiscal year used. */
  fullCostCents: number | null
  /** Full cost, or salary where it is `null`, weighted by each job's E&G share. */
  egCents: number
}

/** The projection's raise for groups without a settled contract and for its later years. */
export const PROJECTED_RAISE_BASIS_POINTS = 300

export const BASIS = 10_000
export const BASIS_BIG = 10_000n

export const FULL_COST_METHOD =
  "Full cost is salary x (1 - leave rate) x (1 + OPE rate), following BRP's rate guidance, with each job's OPE rate group estimated by this site. It uses the OPE rate for the fiscal year stated and the latest published leave rate. The PERS side-account charge is left out, because the census does not say which fund pays a job. Overloads are costed at salary, with no OPE."

export type Job = {
  record: FallRecord
  rateCents: number
  isRemoved: boolean
  group: OpeGroupRef | null
  shareBasisPoints: number
}

export type JobCost = {
  salaryCents: number
  fullCostCents: number | null
  egCents: number
}

export type Rates = {
  ope: Map<string, number>
  leave: Map<string, number>
} | null

/** Division rounded half up, for non-negative operands. */
export function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n)
}

function leaveKey(group: string, appliesTo: string | null): string {
  return `${group}|${appliesTo ?? ''}`
}

export function latestLeaveYear(rates: OpeRates): number {
  return Math.max(...rates.leaveRates.map((rate) => rate.fiscalYear))
}

export function ratesFor(rates: OpeRates, opeFiscalYear: number): Rates {
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

/** A job's cost at its current rate; zero once removed. */
export function costOf(job: Job, rates: Rates): JobCost {
  if (job.isRemoved)
    return { salaryCents: 0, fullCostCents: rates ? 0 : null, egCents: 0 }
  const salaryCents = jobSpendCents({
    ...job.record,
    annualSalaryRateCents: job.rateCents,
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

export function emptySavings(rates: Rates): Savings {
  return {
    jobs: 0,
    salaryCents: 0,
    fullCostCents: rates ? 0 : null,
    egCents: 0,
  }
}

export function addCost(savings: Savings, cost: JobCost, sign: 1 | -1): void {
  savings.salaryCents += sign * cost.salaryCents
  savings.egCents += sign * cost.egCents
  if (savings.fullCostCents !== null && cost.fullCostCents !== null) {
    savings.fullCostCents += sign * cost.fullCostCents
  }
}

export function scopeJobs(
  census: DepartmentCensus,
  scope: ScenarioScope,
): Set<FallRecord> {
  return new Set(filterJobs(placeJobs(census, scope.dept), scope, census.year))
}

export function toJobs(
  census: DepartmentCensus,
  shares: Map<string, number>,
): Job[] {
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
