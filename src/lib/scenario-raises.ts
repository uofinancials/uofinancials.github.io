import type { CitedSource } from '../data/cited-source.ts'
import type { FallRecord } from '../data/fall.ts'
import type { AcrossTheBoardTerm, PoolTerm, RaiseTerm } from '../data/raises.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { fiscalYearOf } from './overview.ts'
import {
  RAISE_ROWS,
  type RaiseRow,
  raiseRowOf,
  termCovers,
} from './raise-groups.ts'
import { type FreezeRule, freezeShare } from './scenario-freeze.ts'
import {
  addCost,
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

type RatedTerm = AcrossTheBoardTerm | PoolTerm

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

/** Each raise row's rate in `fiscalYear`, then "Other jobs": the sum of the terms effective that year that cover it, or 3%. */
export function raiseRates(
  terms: RaiseTerm[],
  fiscalYear: number,
): RaiseRate[] {
  const rated = terms.filter(
    (term): term is RatedTerm =>
      'populations' in term && effectiveFiscalYear(term) === fiscalYear,
  )
  return [...RAISE_ROWS, null].map((row) => {
    const covering = row ? rated.filter((term) => termCovers(term, row)) : []
    return {
      row,
      label: row?.label ?? OTHER_JOBS,
      basisPoints:
        covering.length === 0
          ? PROJECTED_RAISE_BASIS_POINTS
          : covering.reduce((sum, term) => sum + termBasisPoints(term), 0),
      sources: covering.map((term) => term.source),
    }
  })
}

/** The sources cited by any rate, each once. */
export function raiseSources(rates: RaiseRate[]): CitedSource[] {
  const sources = new Map<string, CitedSource>()
  for (const source of rates.flatMap((rate) => rate.sources)) {
    sources.set(`${source.url} ${source.location}`, source)
  }
  return [...sources.values()]
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

/** A job's raise in the first savings year: its raise row's rate, or 3%. */
function firstRaiseOf(
  census: DepartmentCensus,
  raiseRates: RaiseRate[],
): (record: FallRecord) => number {
  const rowRates = new Map(
    raiseRates.map((rate) => [rate.row, rate.basisPoints]),
  )
  return (record) =>
    rowRates.get(
      raiseRowOf(record, census.year, trendGroupOf(record, census.year)),
    ) ?? PROJECTED_RAISE_BASIS_POINTS
}

/** Each projected year's pay over a job's census pay: its first-year raise, then 3% a year, scaled by `BASIS` to the power of the year; jobs with the same first-year raise share one path. */
export function payGrowthOf(
  census: DepartmentCensus,
  raiseRates: RaiseRate[],
  years: number,
): (record: FallRecord) => bigint[] {
  const firstRaise = firstRaiseOf(census, raiseRates)
  const paths = new Map<number, bigint[]>()
  return (record) => {
    const first = firstRaise(record)
    const path = paths.get(first) ?? growth(schedule(first, years))
    paths.set(first, path)
    return path
  }
}

/**
 * For a first-year rate and the raise freezes covering a job, in stack order,
 * the pay growth each freeze removes in each projected year.
 */
function removedGrowth(
  firstBasisPoints: number,
  covering: RaiseFreezeRule[],
  years: number,
): bigint[][] {
  let path = schedule(firstBasisPoints, years)
  return covering.map((rule) => {
    const frozen = path.map((basisPoints, index) =>
      index < rule.years
        ? Math.min(basisPoints, rule.capBasisPoints)
        : basisPoints,
    )
    const before = growth(path)
    const after = growth(frozen)
    path = frozen
    return before.map((product, index) => product - (after[index] ?? 0n))
  })
}

type Tracker = {
  rule: RaiseFreezeRule
  scope: Set<FallRecord>
  byYear: Savings[]
}

/** A hiring freeze's scope and the share of it kept filled each projected year. */
type Filled = { scope: Set<FallRecord>; kept: number[] }

function filledShares(
  census: DepartmentCensus,
  freezes: HeldFreeze[],
  years: number,
): Filled[] {
  return freezes.map(({ rule, rateBasisPoints }) => ({
    scope: scopeJobs(census, rule.scope),
    kept: Array.from(
      { length: years },
      (_, index) => 1 - freezeShare(rule, rateBasisPoints, index + 1) / BASIS,
    ),
  }))
}

/** Adds one job's savings to each raise freeze covering it, each year, scaled by the share the hiring freezes keep filled. */
function saveJob(options: {
  cost: JobCost
  removed: bigint[][]
  covering: Tracker[]
  filled: Filled[]
  divisors: bigint[]
  record: FallRecord
}): void {
  const { cost, divisors } = options
  const holding = options.filled.filter(({ scope }) =>
    scope.has(options.record),
  )
  options.covering.forEach(({ byYear }, at) => {
    byYear.forEach((savings, index) => {
      const removed = options.removed[at]?.[index] ?? 0n
      if (removed === 0n) return
      const held = holding.reduce(
        (share, { kept }) => share * (kept[index] ?? 1),
        1,
      )
      const scale = (cents: number) =>
        Math.round(
          Number(divideHalfUp(BigInt(cents) * removed, divisors[index] ?? 1n)) *
            held,
        )
      addCost(
        savings,
        {
          salaryCents: scale(cost.salaryCents),
          fullCostCents:
            cost.fullCostCents === null ? null : scale(cost.fullCostCents),
          egCents: scale(cost.egCents),
        },
        1,
      )
      savings.jobs += 1
    })
  })
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
  if (options.raiseFreezes.length === 0) return []
  const trackers: Tracker[] = options.raiseFreezes.map((rule) => ({
    rule,
    scope: scopeJobs(census, rule.scope),
    byYear: Array.from({ length: projectedYears }, () => emptySavings(rates)),
  }))
  const filled = filledShares(census, options.freezes, projectedYears)
  const divisors = Array.from(
    { length: projectedYears },
    (_, index) => BASIS_BIG ** BigInt(index + 1),
  )
  const firstRaise = firstRaiseOf(census, options.raiseRates)
  const removedByKey = new Map<string, bigint[][]>()
  for (const job of options.jobs) {
    if (job.isRemoved) continue
    const covering = trackers.filter(({ scope }) => scope.has(job.record))
    if (covering.length === 0) continue
    const first = firstRaise(job.record)
    const key = [
      first,
      ...covering.map((tracker) => trackers.indexOf(tracker)),
    ].join(' ')
    const removed =
      removedByKey.get(key) ??
      removedGrowth(
        first,
        covering.map(({ rule }) => rule),
        projectedYears,
      )
    removedByKey.set(key, removed)
    saveJob({
      cost: costOf(job, rates),
      removed,
      covering,
      filled,
      divisors,
      record: job.record,
    })
  }
  return trackers.map(({ byYear }) => ({ kind: 'raises', byYear }))
}
