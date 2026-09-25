import type { Projection } from '../data/outlook.ts'
import { type GapRow, gapRows } from './budget-outlook.ts'
import type { ScenarioResult } from './scenario.ts'

export type OutlookRow = GapRow & {
  /** E&G savings in the year: zero before the first year after the census. */
  savingsCents: number
  remainingRunRateCents: number
  remainingFundBalanceCents: number
  /** Ending balance over the year's expenses less savings, in weeks to a tenth; `null` when those expenses are not positive. */
  remainingWeeks: number | null
}

/** The projection's own assumption for pay in later years. */
export const SAVINGS_GROWTH_BASIS_POINTS = 300
const BASIS = 10_000n
const WEEKS_PER_YEAR = 52
const TENTHS = 10

export const SCENARIO_OUTLOOK_METHOD =
  "Savings against the projection are this site's estimate. Each year's E&G savings start in full in the first fiscal year after the census and grow 3% a year, the projection's own raise assumption for later years; freeze savings follow the freeze year by year. Savings use that first year's OPE rates, are gross, and count no revenue lost. The remaining gap is the projected run rate plus savings, and the remaining fund balance is the projected balance plus every year's savings so far. The projection may already count the hiring freeze announced in May 2026; its materials do not say."

function grow(cents: number, years: number): number {
  const numerator =
    BigInt(cents) *
    (BASIS + BigInt(SAVINGS_GROWTH_BASIS_POINTS)) ** BigInt(years)
  const denominator = BASIS ** BigInt(years)
  return Number((numerator * 2n + denominator) / (denominator * 2n))
}

/** E&G savings in each projected year after the census, the first at index 0. */
export function yearlySavings(result: ScenarioResult, years: number): number[] {
  return Array.from({ length: years }, (_, index) => {
    const freezeCents = result.freezes.reduce(
      (sum, freeze) => sum + (freeze.byYear[index]?.egCents ?? 0),
      0,
    )
    return grow(result.total.egCents + freezeCents, index)
  })
}

function weeksOf(balanceCents: number, expenseCents: number): number | null {
  if (expenseCents <= 0) return null
  return (
    Math.round(((balanceCents * WEEKS_PER_YEAR) / expenseCents) * TENTHS) /
    TENTHS
  )
}

/** The projection's years with a scenario's savings set against them. */
export function scenarioOutlook(options: {
  result: ScenarioResult
  projection: Projection
  censusFiscalYear: number
}): OutlookRow[] {
  const { result, projection, censusFiscalYear } = options
  const rows = gapRows(projection)
  const found = rows.findIndex((row) => row.fiscalYear > censusFiscalYear)
  const firstIndex = found < 0 ? rows.length : found
  const savings = yearlySavings(result, rows.length - firstIndex)
  let savedCents = 0
  return rows.map((row, index) => {
    const savingsCents = savings[index - firstIndex] ?? 0
    savedCents += savingsCents
    const remainingFundBalanceCents = row.endingFundBalanceCents + savedCents
    return {
      ...row,
      savingsCents,
      remainingRunRateCents: row.runRateCents + savingsCents,
      remainingFundBalanceCents,
      remainingWeeks: weeksOf(
        remainingFundBalanceCents,
        row.expenseCents - savingsCents,
      ),
    }
  })
}
