import { z } from 'zod'
import { fallRecordSchema } from './fall.ts'

const year = z.number().int()
const cents = z.number().int()
const count = z.number().int().nonnegative()
const fraction = z.number().nullable()

const trendPointSchema = z.strictObject({
  year,
  jobs: count,
  spendCents: cents.nullable(),
  fteHundredths: count.nullable(),
  medianRateCents: cents.nullable(),
})

const trendsSchema = z.strictObject({
  series: z.array(
    z.strictObject({ key: z.string(), points: z.array(trendPointSchema) }),
  ),
  total: z.array(trendPointSchema),
})

const areaSchema = z.strictObject({ code: z.string(), name: z.string() })

const tableYearSchema = z.strictObject({ year, fiscalYear: year })

const departmentRowSchema = z.strictObject({
  code: z.string().nullable(),
  name: z.string(),
  area: areaSchema.nullable(),
  budgetCents: cents.nullable(),
  jobs: count,
  spendCents: cents.nullable(),
  medianRateCents: cents.nullable(),
  changes: z.strictObject({
    budget: fraction,
    jobs: fraction,
    spend: fraction,
    median: fraction,
  }),
})

const homeSchema = z.strictObject({
  year,
  fiscalYear: year,
  headlines: z.strictObject({
    runRate: z.strictObject({ fiscalYear: year, cents }),
    budgetCents: cents,
    spendCents: cents,
    people: count,
  }),
  /** One per home example, in order. */
  answers: z.array(
    z.strictObject({
      fiscalYear: year,
      savingsCents: cents,
      gapShare: fraction,
    }),
  ),
  areas: z.array(
    departmentRowSchema.pick({
      code: true,
      name: true,
      budgetCents: true,
      jobs: true,
      spendCents: true,
    }),
  ),
  bases: z.strictObject({
    published: count,
    name: count,
    hand: count,
    unassigned: count,
  }),
  topPaid: z.array(fallRecordSchema),
})

const nameEntrySchema = z.strictObject({
  name: z.string().min(1),
  /** Census years, split where no person link joins one year to the next. */
  runs: z.array(z.array(year).min(1)).min(1),
  /** Whether any of the name's records is flagged as a possible student. */
  possibleStudent: z.boolean(),
})

/** Figures derived from the committed data files by `pnpm scrape summary`, for the pages' default views. */
export const summarySchema = z.strictObject({
  /** Every census, kind "all", unfiltered; keyed by the opened group, or "all" for none. */
  trends: z.record(z.string(), trendsSchema),
  departments: z.strictObject({
    now: tableYearSchema,
    before: tableYearSchema,
    areas: z.array(areaSchema),
    rows: z.strictObject({
      areas: z.array(departmentRowSchema),
      units: z.array(departmentRowSchema),
    }),
  }),
  home: homeSchema,
  people: z.strictObject({
    names: z.array(nameEntrySchema),
    medians: z.record(
      z.string(),
      z.strictObject({ medianCents: cents, jobs: count }),
    ),
  }),
})

export type Summary = z.infer<typeof summarySchema>
export type NameEntry = z.infer<typeof nameEntrySchema>
