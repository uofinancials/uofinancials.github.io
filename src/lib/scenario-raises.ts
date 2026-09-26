import type { CitedSource } from '../data/cited-source.ts'
import type { FallRecord } from '../data/fall.ts'
import type { RaiseTerm } from '../data/raises.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { fiscalYearOf } from './overview.ts'
import { RAISE_ROWS, type RaiseRow, raiseRowOf } from './raise-groups.ts'
import { type FreezeRule, freezeShare } from './scenario-freeze.ts'
import {
  BASIS,
  BASIS_BIG,
  costOf,
  divideHalfUp,
  emptySavings,
  type Job,
  type JobCost,
  PROJECTED_RAISE_BASIS_POINTS,
  type Rates,
  type Savings,
  type ScenarioScope,
  scopeJobs,
} from './scenario-jobs.ts'
import { trendGroupOf } from './trend-groups.ts'

export type RaiseFreezeRule = {
  kind: 'raises'
  scope: ScenarioScope
  /** Fiscal years the freeze lasts, from the first year after the census. */
  years: number
  /** The raise still given in a frozen year; 0 is a full freeze. */
  capBasisPoints: number
}

export type RaiseFreezeResult = {
  kind: 'raises'
  /** One per projected year, in that year's pay: `jobs` is the jobs whose raise the rule has reduced. */
  byYear: Savings[]
}

/** A raise row's rate in the first savings year; no sources means the projection's 3%. */
export type RaiseRate = {
  /** `null` for jobs in no raise row. */
  row: RaiseRow | null
  label: string
  basisPoints: number
  sources: CitedSource[]
}

/** A hiring freeze in the stack and the turnover rate it found. */
export type HeldFreeze = { rule: FreezeRule; rateBasisPoints: number }

const OTHER_JOBS = 'Other jobs'

export const RAISE_FREEZE_METHOD =
  "A raise freeze saves the raises the projection spends, as this site's estimate. In the first year after the census each raise group's rate is its cited across-the-board, merit pool, and equity pool terms effective that year, or the projection's 3% where none is published; every later year is 3% for every group. Each job's raise group is estimated from its published class, rank, OA salary grade, and title, since UO publishes no bargaining unit; jobs in no group (executives, coaches, postdoctoral scholars, and unranked jobs with no OA grade) get 3%. A frozen year gives no raise, or only up to the cap; raises then resume on the lower pay, with no catch-up. Each frozen year counts in full. Steps, longevity, and one-time payments are not counted. A raise freeze applies last, to the pay every other rule left and only to the part of a job a hiring freeze keeps filled."

type RatedTerm = Extract<
  RaiseTerm,
  { kind: 'across-the-board' | 'merit-pool' | 'equity-pool' }
>

function effectiveFiscalYear(term: RatedTerm): number | null {
  const date =
    term.kind === 'across-the-board' ? term.effective.from : term.effectiveDate
  return date === null ? null : fiscalYearOf(date)
}

function termBasisPoints(term: RatedTerm): number {
  if (term.basisPoints !== null) return term.basisPoints
  throw new Error(
    `The ${term.employeeGroup} term "${term.appliesTo}" (${term.percent}%) has no whole basis points`,
  )
}

function covers(term: RatedTerm, row: RaiseRow): boolean {
  return (
    term.employeeGroup === row.group &&
    (term.populations.includes('all') ||
      term.populations.includes(row.population))
  )
}

/** Each raise row's rate in `fiscalYear`, then "Other jobs": the sum of the terms effective that year that cover it, or 3%. */
export function raiseRates(
  terms: RaiseTerm[],
  fiscalYear: number,
): RaiseRate[] {
  const rated = terms.filter(
    (term): term is RatedTerm =>
      (term.kind === 'across-the-board' ||
        term.kind === 'merit-pool' ||
        term.kind === 'equity-pool') &&
      effectiveFiscalYear(term) === fiscalYear,
  )
  const projected = (row: RaiseRow | null, label: string): RaiseRate => ({
    row,
    label,
    basisPoints: PROJECTED_RAISE_BASIS_POINTS,
    sources: [],
  })
  return [
    ...RAISE_ROWS.map((row) => {
      const covering = rated.filter((term) => covers(term, row))
      if (covering.length === 0) return projected(row, row.label)
      return {
        row,
        label: row.label,
        basisPoints: covering.reduce(
          (sum, term) => sum + termBasisPoints(term),
          0,
        ),
        sources: covering.map((term) => term.source),
      }
    }),
    projected(null, OTHER_JOBS),
  ]
}

/** Each projected year's raise in basis points: the first year's rate, then 3%. */
function schedule(firstBasisPoints: number, years: number): number[] {
  return Array.from({ length: years }, (_, index) =>
    index === 0 ? firstBasisPoints : PROJECTED_RAISE_BASIS_POINTS,
  )
}

/** The growth each year's pay has had since the census, scaled by `BASIS` to the power of the year. */
function growth(path: number[]): bigint[] {
  let product = 1n
  return path.map((basisPoints) => {
    product *= BASIS_BIG + BigInt(basisPoints)
    return product
  })
}

function scaleBig(cents: number, numerator: bigint, year: number): number {
  return Number(
    divideHalfUp(BigInt(cents) * numerator, BASIS_BIG ** BigInt(year + 1)),
  )
}

/** A job's cost times the pay growth a rule removes in `year` (from 0), times the share kept filled. */
function savedCost(
  cost: JobCost,
  removed: bigint,
  year: number,
  held: number,
): JobCost {
  const scale = (cents: number) =>
    Math.round(scaleBig(cents, removed, year) * held)
  return {
    salaryCents: scale(cost.salaryCents),
    fullCostCents:
      cost.fullCostCents === null ? null : scale(cost.fullCostCents),
    egCents: scale(cost.egCents),
  }
}

type Tracker = {
  rule: RaiseFreezeRule
  scope: Set<FallRecord>
  byYear: Savings[]
}

/** The share of a job each hiring freeze covering it keeps filled, per projected year. */
function heldShares(
  record: FallRecord,
  freezes: { held: HeldFreeze; scope: Set<FallRecord> }[],
  years: number,
): number[] {
  const covering = freezes.filter(({ scope }) => scope.has(record))
  return Array.from({ length: years }, (_, index) =>
    covering.reduce(
      (share, { held }) =>
        share *
        (1 - freezeShare(held.rule, held.rateBasisPoints, index + 1) / BASIS),
      1,
    ),
  )
}

/** Lays each raise freeze covering a job over its raise path, in stack order. */
function saveJob(options: {
  cost: JobCost
  path: number[]
  held: number[]
  covering: Tracker[]
}): void {
  let path = options.path
  for (const { rule, byYear } of options.covering) {
    const frozen = path.map((basisPoints, index) =>
      index < rule.years
        ? Math.min(basisPoints, rule.capBasisPoints)
        : basisPoints,
    )
    const before = growth(path)
    const after = growth(frozen)
    byYear.forEach((savings, index) => {
      const removed = (before[index] ?? 0n) - (after[index] ?? 0n)
      if (removed === 0n) return
      const saved = savedCost(
        options.cost,
        removed,
        index,
        options.held[index] ?? 1,
      )
      savings.jobs += 1
      savings.salaryCents += saved.salaryCents
      savings.egCents += saved.egCents
      if (savings.fullCostCents !== null && saved.fullCostCents !== null) {
        savings.fullCostCents += saved.fullCostCents
      }
    })
    path = frozen
  }
}

/** Each raise freeze's savings per projected year, in stack order, over the pay every other rule left. */
export function raiseFreezeSavings(options: {
  census: DepartmentCensus
  jobs: Job[]
  raiseFreezes: RaiseFreezeRule[]
  freezes: HeldFreeze[]
  rates: Rates
  raiseRates: RaiseRate[]
  projectedYears: number
}): RaiseFreezeResult[] {
  const { census, rates, projectedYears } = options
  const trackers: Tracker[] = options.raiseFreezes.map((rule) => ({
    rule,
    scope: scopeJobs(census, rule.scope),
    byYear: Array.from({ length: projectedYears }, () => emptySavings(rates)),
  }))
  const freezes = options.freezes.map((held) => ({
    held,
    scope: scopeJobs(census, held.rule.scope),
  }))
  const rowRates = new Map(
    options.raiseRates.map((rate) => [rate.row, rate.basisPoints]),
  )
  for (const job of options.jobs) {
    if (job.isRemoved) continue
    const covering = trackers.filter(({ scope }) => scope.has(job.record))
    if (covering.length === 0) continue
    const row = raiseRowOf(
      job.record,
      census.year,
      trendGroupOf(job.record, census.year),
    )
    saveJob({
      cost: costOf(job, rates),
      path: schedule(
        rowRates.get(row) ?? PROJECTED_RAISE_BASIS_POINTS,
        projectedYears,
      ),
      held: heldShares(job.record, freezes, projectedYears),
      covering,
    })
  }
  return trackers.map(({ byYear }) => ({ kind: 'raises', byYear }))
}
