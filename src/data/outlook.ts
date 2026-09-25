import { z } from 'zod'

const nonBlank = z.string().min(1)
const isoDate = z.iso.date()
const fiscalYear = z.number().int().min(2000)
const cents = z.number().int()
const centsByYear = z.array(cents)

const sourceSchema = z.strictObject({
  url: z.url(),
  document: nonBlank,
  location: nonBlank,
  retrievedOn: isoDate,
})

const lineSchema = z.strictObject({
  label: nonBlank,
  section: z.enum(['revenue', 'expense']),
  /** A subtotal sums the lines since the last subtotal; a total sums the subtotals and the lines under none. */
  kind: z.enum(['line', 'subtotal', 'total']),
  cents: centsByYear,
})

const caseSchema = z.strictObject({
  label: nonBlank,
  runRateCents: centsByYear,
  endingFundBalanceCents: centsByYear,
  weeksOfExpenses: z.array(z.number()),
  presentValueCents: cents,
})

const projectionSchema = z
  .strictObject({
    id: nonBlank,
    title: nonBlank,
    fund: z.literal('E&G'),
    fiscalYears: z.array(fiscalYear).min(1),
    source: sourceSchema,
    lines: z.array(lineSchema).min(1),
    runRateCents: centsByYear,
    beginningFundBalanceCents: centsByYear,
    endingFundBalanceCents: centsByYear,
    weeksOfExpenses: z.array(z.number()),
    presentValueCents: cents,
    reductionTargetCents: cents,
    reductionTargetSource: sourceSchema,
    cases: z.array(caseSchema),
    casesSource: sourceSchema,
    assumptions: z.array(
      z.strictObject({ text: nonBlank, location: nonBlank }),
    ),
  })
  .refine(
    (projection) => {
      const years = projection.fiscalYears.length
      return [
        projection.runRateCents,
        projection.beginningFundBalanceCents,
        projection.endingFundBalanceCents,
        projection.weeksOfExpenses,
        ...projection.lines.map((line) => line.cents),
        ...projection.cases.flatMap((scenario) => [
          scenario.runRateCents,
          scenario.endingFundBalanceCents,
          scenario.weeksOfExpenses,
        ]),
      ].every((values) => values.length === years)
    },
    { message: 'every yearly series has one value per fiscal year' },
  )

export const outlookSchema = z.strictObject({
  projections: z.array(projectionSchema).min(1),
  /** Actuals reported after a projection, shown beside it. */
  reportedRunRates: z.array(
    z.strictObject({
      fiscalYear,
      runRateCents: cents,
      basis: nonBlank,
      source: sourceSchema,
    }),
  ),
  allFunds: z.strictObject({
    fiscalYear,
    egExpenseCents: cents,
    egRevenueCents: cents,
    otherExpenseCents: cents,
    otherRevenueCents: cents,
    totalExpenseCents: cents,
    totalRevenueCents: cents,
    source: sourceSchema,
  }),
  actions: z.array(
    z.strictObject({ date: isoDate, text: nonBlank, source: sourceSchema }),
  ),
})

export type Outlook = z.infer<typeof outlookSchema>
export type Projection = Outlook['projections'][number]
export type ProjectionLine = Projection['lines'][number]
export type OutlookSource = z.infer<typeof sourceSchema>
