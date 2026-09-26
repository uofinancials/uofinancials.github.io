import { fiscalYearLabel } from '../data/budget.ts'
import type { OpeRates } from '../data/ope.ts'
import type { Projection } from '../data/outlook.ts'
import { sectionTotal } from './budget-outlook.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { type Rule, runScenario, type ScenarioResult } from './scenario.ts'
import { BASIS_BIG, divideHalfUp } from './scenario-jobs.ts'

/** What savings are set against: the projection or one of its published cases. */
export type Baseline = {
  label: string
  runRateCents: number[]
  endingFundBalanceCents: number[]
  /** `null` for an alternative case, which publishes no expenses. */
  expenseCents: number[] | null
}

export type OutlookRow = {
  fiscalYear: number
  runRateCents: number
  endingFundBalanceCents: number
  /** E&G savings in the year: zero before the first year after the census. */
  savingsCents: number
  remainingRunRateCents: number
  remainingFundBalanceCents: number
  /** Ending balance over the year's expenses less savings, in weeks to a tenth; `null` when the expenses are unpublished or not positive. */
  remainingWeeks: number | null
}

/** The projection's own assumption for pay in later years. */
export const SAVINGS_GROWTH_BASIS_POINTS = 300
const WEEKS_PER_YEAR = 52
const PROJECTION_LABEL = 'The projection as published'
const TENTHS = 10

export const SCENARIO_OUTLOOK_METHOD =
  "Savings against the projection are this site's estimate. Each year's E&G savings start in full in the first fiscal year after the census and grow 3% a year, the projection's own raise assumption for later years; freeze savings follow the freeze year by year. Savings use that first year's OPE rates, are gross, and count no revenue lost. The remaining gap is the projected run rate plus savings, and the remaining fund balance is the projected balance plus every year's savings so far. The projection may already count the hiring freeze announced in May 2026; its materials do not say."

function grow(cents: number, years: number): number {
  const numerator =
    BigInt(cents) *
    (BASIS_BIG + BigInt(SAVINGS_GROWTH_BASIS_POINTS)) ** BigInt(years)
  return Number(divideHalfUp(numerator, BASIS_BIG ** BigInt(years)))
}

/** E&G savings in each projected year after the census, the first at index 0. */
export function yearlySavings(result: ScenarioResult, years: number): number[] {
  return Array.from({ length: years }, (_, index) => {
    const freezeCents = result.rules.reduce(
      (sum, rule) =>
        rule.kind === 'freeze' ? sum + (rule.byYear[index]?.egCents ?? 0) : sum,
      0,
    )
    return grow(result.total.egCents + freezeCents, index)
  })
}

function hasSameYears(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((cents, index) => cents === b[index])
}

/**
 * The projection with its expenses, named after the case that matches it,
 * then every other published case.
 */
export function baselines(projection: Projection): Baseline[] {
  const isBase = (scenario: Projection['cases'][number]) =>
    hasSameYears(scenario.runRateCents, projection.runRateCents) &&
    hasSameYears(
      scenario.endingFundBalanceCents,
      projection.endingFundBalanceCents,
    )
  const base: Baseline = {
    label: projection.cases.find(isBase)?.label ?? PROJECTION_LABEL,
    runRateCents: projection.runRateCents,
    endingFundBalanceCents: projection.endingFundBalanceCents,
    expenseCents: sectionTotal(projection, 'expense'),
  }
  const others = projection.cases
    .filter((scenario) => !isBase(scenario))
    .map(({ label, runRateCents, endingFundBalanceCents }) => ({
      label,
      runRateCents,
      endingFundBalanceCents,
      expenseCents: null,
    }))
  return [base, ...others]
}

function weeksOf(
  balanceCents: number,
  expenseCents: number | undefined,
): number | null {
  if (expenseCents === undefined || expenseCents <= 0) return null
  return (
    Math.round(((balanceCents * WEEKS_PER_YEAR) / expenseCents) * TENTHS) /
    TENTHS
  )
}

/** The index of the first projected year after the census, or the year count when there is none. */
function firstSavingsIndex(
  fiscalYears: number[],
  censusFiscalYear: number,
): number {
  const found = fiscalYears.findIndex((year) => year > censusFiscalYear)
  return found < 0 ? fiscalYears.length : found
}

/** The projection's years with a scenario's savings set against a baseline. */
export function outlookRows(options: {
  result: ScenarioResult
  fiscalYears: number[]
  baseline: Baseline
  censusFiscalYear: number
}): OutlookRow[] {
  const { result, fiscalYears, baseline, censusFiscalYear } = options
  const firstIndex = firstSavingsIndex(fiscalYears, censusFiscalYear)
  const savings = yearlySavings(result, fiscalYears.length - firstIndex)
  let savedCents = 0
  return fiscalYears.map((fiscalYear, index) => {
    const runRateCents = baseline.runRateCents[index] ?? 0
    const endingFundBalanceCents = baseline.endingFundBalanceCents[index] ?? 0
    const savingsCents = savings[index - firstIndex] ?? 0
    savedCents += savingsCents
    const remainingFundBalanceCents = endingFundBalanceCents + savedCents
    const expenseCents = baseline.expenseCents?.[index]
    return {
      fiscalYear,
      runRateCents,
      endingFundBalanceCents,
      savingsCents,
      remainingRunRateCents: runRateCents + savingsCents,
      remainingFundBalanceCents,
      remainingWeeks: weeksOf(
        remainingFundBalanceCents,
        expenseCents === undefined ? undefined : expenseCents - savingsCents,
      ),
    }
  })
}

/**
 * Runs a scenario against a baseline over the projection's years: at the OPE
 * rates of the first projected year after the census, with freezes laid over
 * every projected year from then.
 */
export function scenarioOutlook(options: {
  census: DepartmentCensus
  censusFiscalYear: number
  rules: Rule[]
  rates: OpeRates
  egShares: Map<string, number>
  history: DepartmentCensus[]
  fiscalYears: number[]
  baseline: Baseline
}): { result: ScenarioResult; rows: OutlookRow[] } {
  const { fiscalYears, censusFiscalYear } = options
  const firstIndex = firstSavingsIndex(fiscalYears, censusFiscalYear)
  const result = runScenario({
    ...options,
    opeFiscalYear: fiscalYears[firstIndex] ?? censusFiscalYear,
    projectedYears: fiscalYears.length - firstIndex,
  })
  return { result, rows: outlookRows({ ...options, result }) }
}

/** The first fiscal year whose fund balance with savings is below zero, or `null`. */
export function firstShortfallYear(rows: OutlookRow[]): number | null {
  return (
    rows.find((row) => row.remainingFundBalanceCents < 0)?.fiscalYear ?? null
  )
}

/** The outlook chart's fiscal-year labels and its published and with-savings lines. */
export function scenarioSeries(rows: OutlookRow[]): {
  labels: string[]
  series: { key: string; values: number[] }[]
} {
  const line = (key: string, pick: (row: OutlookRow) => number) => ({
    key,
    values: rows.map(pick),
  })
  return {
    labels: rows.map((row) => fiscalYearLabel(row.fiscalYear)),
    series: [
      line('Run rate', (row) => row.runRateCents),
      line('Run rate with savings', (row) => row.remainingRunRateCents),
      line('Ending fund balance', (row) => row.endingFundBalanceCents),
      line('Fund balance with savings', (row) => row.remainingFundBalanceCents),
    ],
  }
}
