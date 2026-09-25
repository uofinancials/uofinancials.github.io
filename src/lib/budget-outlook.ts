import { fiscalYearLabel } from '../data/budget.ts'
import type {
  Outlook,
  OutlookSource,
  Projection,
  ProjectionLine,
} from '../data/outlook.ts'

/** How the page describes the projection's figures, as stated on it. */
export const PROJECTION_NOTE =
  'These are the projection’s figures as published, not this site’s estimates. They cover the E&G fund only, the part of the budget funded mostly by tuition and state appropriation, and leave out any budget action not yet taken.'

export function sectionTotal(
  projection: Projection,
  section: ProjectionLine['section'],
): number[] {
  const line = projection.lines.find(
    (candidate) => candidate.section === section && candidate.kind === 'total',
  )
  if (!line)
    throw new Error(`Projection ${projection.id} has no ${section} total`)
  return line.cents
}

export type GapRow = {
  fiscalYear: number
  revenueCents: number
  expenseCents: number
  runRateCents: number
  endingFundBalanceCents: number
  /** A run rate reported after the projection for the year, if any. */
  reported: Outlook['reportedRunRates'][number] | null
}

/** One row per projected year: its totals, run rate, and ending fund balance, with any later reported run rate. */
export function gapRows(
  projection: Projection,
  reported: Outlook['reportedRunRates'],
): GapRow[] {
  const revenue = sectionTotal(projection, 'revenue')
  const expenses = sectionTotal(projection, 'expense')
  return projection.fiscalYears.map((fiscalYear, index) => ({
    fiscalYear,
    revenueCents: revenue[index] ?? 0,
    expenseCents: expenses[index] ?? 0,
    runRateCents: projection.runRateCents[index] ?? 0,
    endingFundBalanceCents: projection.endingFundBalanceCents[index] ?? 0,
    reported: reported.find((entry) => entry.fiscalYear === fiscalYear) ?? null,
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

/** Each distinct document the outlook cites, in first-cited order, with its latest retrieval date. */
export function listOutlookDocuments(
  outlook: Outlook,
): Omit<OutlookSource, 'location'>[] {
  const sources = [
    ...outlook.projections.flatMap((projection) => [
      projection.source,
      projection.reductionTargetSource,
      projection.casesSource,
    ]),
    ...outlook.reportedRunRates.map(({ source }) => source),
    outlook.allFunds.source,
    ...outlook.actions.map(({ source }) => source),
  ]
  const documents = new Map<string, Omit<OutlookSource, 'location'>>()
  for (const { url, document, retrievedOn } of sources) {
    const cited = documents.get(url)
    if (!cited || cited.retrievedOn < retrievedOn) {
      documents.set(url, { url, document, retrievedOn })
    }
  }
  return [...documents.values()]
}
