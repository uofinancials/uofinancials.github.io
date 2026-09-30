import { z } from 'zod'
import { budgetPeriodSchema } from './budget.ts'
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

const changeSeriesSchema = z.strictObject({
  key: z.string(),
  points: z.array(
    z.strictObject({
      fromYear: year,
      pairs: count,
      median: z.number().nullable(),
    }),
  ),
})

const codeTrendSchema = z.strictObject({
  code: z.string(),
  name: z.string(),
  points: z.array(trendPointSchema),
})

/** An area's or unit's jobs by group in each census, and its continuing jobs' median pay change by group for each census pair. */
const scopeTrendsSchema = z.strictObject({
  code: z.string(),
  name: z.string(),
  trends: trendsSchema,
  payChanges: z.array(changeSeriesSchema),
})

/** An area's figures and each of its units' and pay departments', written by `pnpm scrape summary` beside the summary. */
export const areaTrendsSchema = scopeTrendsSchema.extend({
  units: z.array(scopeTrendsSchema),
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
  censusDate: z.iso.date(),
  fiscalYear: year,
  period: budgetPeriodSchema,
  headlines: z.strictObject({
    runRate: z.strictObject({ fiscalYear: year, cents }),
    budgetCents: cents,
    spendCents: cents,
    people: count,
  }),
  answers: z.array(
    z.strictObject({
      question: z.string(),
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
  /** The other names this person's records were published under, where the site joins more than one. */
  otherNames: z.array(z.string().min(1)).min(1).optional(),
})

/** Figures derived from the committed data files by `pnpm scrape summary`, for the pages' default views. */
export const summarySchema = z.strictObject({
  trends: z.strictObject({
    /** Every census's jobs by group. */
    all: trendsSchema,
    /** Continuing jobs' median change in salary rate for every census pair, all of them then by group. */
    payChanges: z.array(changeSeriesSchema),
    /** Each area's jobs in every census, and the units and pay departments its trends file holds. */
    areas: z.array(
      codeTrendSchema.extend({
        units: z.array(z.strictObject({ code: z.string(), name: z.string() })),
      }),
    ),
  }),
  departments: z.strictObject({
    now: tableYearSchema,
    before: tableYearSchema,
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
export type CodeTrend = z.infer<typeof codeTrendSchema>
export type SummaryArea = Summary['trends']['areas'][number]
export type ScopeTrends = z.infer<typeof scopeTrendsSchema>
export type AreaTrends = z.infer<typeof areaTrendsSchema>
export type NameEntry = z.infer<typeof nameEntrySchema>
