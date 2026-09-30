import type { FallRecord } from '../../data/fall.ts'
import type { FyTempsUnit } from '../../data/fy-temps.ts'
import type { OpeRates } from '../../data/ope.ts'
import { TEMPS_GROUP, trendGroupOf } from '../census/groups.ts'
import { filterJobs, type JobFilter } from '../census/salary-distribution.ts'
import { placeJobs } from '../census/search.ts'
import { isClassifiedTemp, jobSpendCents } from '../census/totals.ts'
import { isInScope, type TempsScope } from '../departments/fy-temps.ts'
import { type DepartmentCensus, isAreaCode } from '../departments/jobs.ts'
import { egShareOf } from './eg-share.ts'
import { type OpeGroupRef, opeGroupOf, TEMPS_OPE_GROUP } from './ope-groups.ts'

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

/** A census job at its current rate, or one unit's classified temporaries at their current FY pay (`rateCents`). */
export type Job = {
  rateCents: number
  isRemoved: boolean
  group: OpeGroupRef | null
  shareBasisPoints: number
} & (
  | { kind: 'census'; record: FallRecord }
  | { kind: 'temps'; unit: FyTempsUnit }
)

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

/** Cents grown by `product`, a growth `years` years out scaled by `BASIS` to that power, rounded half up. */
export function growCents(
  cents: number,
  product: bigint,
  years: number,
): number {
  return Number(
    divideHalfUp(BigInt(cents) * product, BASIS_BIG ** BigInt(years)),
  )
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

/** A job's salary spend at its current rate, or a unit's temporaries' current FY pay, removed or not. */
export function salaryCentsOf(job: Job): number {
  return job.kind === 'temps'
    ? job.rateCents
    : jobSpendCents({ ...job.record, annualSalaryRateCents: job.rateCents })
}

/** A job's cost at its current rate; zero once removed. */
export function costOf(job: Job, rates: Rates): JobCost {
  if (job.isRemoved)
    return { salaryCents: 0, fullCostCents: rates ? 0 : null, egCents: 0 }
  const salaryCents = salaryCentsOf(job)
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

/** The jobs a job stands for: one, or a unit's FY jobs. */
export function jobCount(job: Job): number {
  return job.kind === 'temps' ? job.unit.jobs : 1
}

export function scopeJobs(
  census: DepartmentCensus,
  scope: ScenarioScope,
): Set<FallRecord> {
  return new Set(filterJobs(placeJobs(census, scope.dept), scope, census.year))
}

/** Whether a scope reaches a unit's temporaries: it names no term or position, and its group, kind, and department admit them. */
function reachesTemps(
  census: DepartmentCensus,
  scope: ScenarioScope,
): (unit: FyTempsUnit) => boolean {
  const { dept } = scope
  const isAdmitted =
    (scope.group === null || scope.group === TEMPS_GROUP) &&
    scope.kind !== 'unclassified' &&
    scope.term === null &&
    scope.position === null
  if (!isAdmitted) return () => false
  const tempsScope: TempsScope =
    dept === null
      ? { kind: 'all' }
      : { kind: isAreaCode(dept, [census]) ? 'area' : 'unit', code: dept }
  return (unit) => isInScope(unit, tempsScope)
}

/** Whether a scope reaches a job: a census job through the /people filters, a unit's temporaries by their unit and area. */
export function scopeReach(
  census: DepartmentCensus,
  scope: ScenarioScope,
): (job: Job) => boolean {
  const records = scopeJobs(census, scope)
  const temps = reachesTemps(census, scope)
  return (job) =>
    job.kind === 'census' ? records.has(job.record) : temps(job.unit)
}

/** The census's jobs but its classified temporaries, then one job per unit of `temps`, their FY pay. */
export function toJobs(
  census: DepartmentCensus,
  shares: Map<string, number>,
  temps: FyTempsUnit[],
): Job[] {
  const jobs: Job[] = census.records
    .filter((record) => !isClassifiedTemp(record))
    .map((record) => ({
      kind: 'census',
      record,
      rateCents: record.annualSalaryRateCents,
      isRemoved: false,
      group: opeGroupOf(record, trendGroupOf(record, census.year), census.year),
      shareBasisPoints: egShareOf(census.assign(record).area, shares),
    }))
  return [
    ...jobs,
    ...temps.map(
      (unit): Job => ({
        kind: 'temps',
        unit,
        rateCents: unit.payCents,
        isRemoved: false,
        group: TEMPS_OPE_GROUP,
        shareBasisPoints: egShareOf(unit.area, shares),
      }),
    ),
  ]
}
