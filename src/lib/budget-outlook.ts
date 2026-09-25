import { fiscalYearLabel } from '../data/budget.ts'
import type { CitedSource } from '../data/cited-source.ts'
import type { Outlook, Projection, ProjectionLine } from '../data/outlook.ts'

/** A section's total line by fiscal year; the schema requires exactly one. */
export function sectionTotal(
  projection: Projection,
  section: ProjectionLine['section'],
): number[] {
  return (
    projection.lines.find(
      (line) => line.section === section && line.kind === 'total',
    )?.cents ?? []
  )
}

export type GapRow = {
  fiscalYear: number
  revenueCents: number
  expenseCents: number
  runRateCents: number
  endingFundBalanceCents: number
}

export function gapRows(projection: Projection): GapRow[] {
  const revenue = sectionTotal(projection, 'revenue')
  const expenses = sectionTotal(projection, 'expense')
  return projection.fiscalYears.map((fiscalYear, index) => ({
    fiscalYear,
    revenueCents: revenue[index] ?? 0,
    expenseCents: expenses[index] ?? 0,
    runRateCents: projection.runRateCents[index] ?? 0,
    endingFundBalanceCents: projection.endingFundBalanceCents[index] ?? 0,
  }))
}

export const RUN_RATE_SERIES = 'Run rate'
export const FUND_BALANCE_SERIES = 'Ending fund balance'

/** The chart's fiscal-year labels and its run-rate and ending fund balance lines. */
export function outlookSeries(projection: Projection): {
  labels: string[]
  series: { key: string; values: number[] }[]
} {
  return {
    labels: projection.fiscalYears.map(fiscalYearLabel),
    series: [
      { key: RUN_RATE_SERIES, values: projection.runRateCents },
      { key: FUND_BALANCE_SERIES, values: projection.endingFundBalanceCents },
    ],
  }
}

/** Every source the outlook cites, in the order the budget page shows them. */
export function outlookSources(outlook: Outlook): CitedSource[] {
  return [
    ...outlook.projections.flatMap((projection) => [
      projection.source,
      projection.reductionTargetSource,
      projection.casesSource,
    ]),
    ...outlook.reportedRunRates.map(({ source }) => source),
    outlook.allFunds.source,
    ...outlook.actions.map(({ source }) => source),
  ]
}
