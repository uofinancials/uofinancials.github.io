import { z } from 'zod'
import { budgetPeriodSchema, twoDigitCode } from './budget.ts'
import { trendPointSchema, trendsSchema } from './summary.ts'

const year = z.number().int()
const count = z.number().int().nonnegative()
/** Cents per fiscal year; `null` where the code is not in that year's budget. */
const yearValues = z.array(z.number().int().nullable())
const series = z.array(z.strictObject({ key: z.string(), values: yearValues }))
const classRows = z.array(
  trendPointSchema.omit({ year: true }).extend({ label: z.string() }),
)

/** One code's department page, written by `pnpm scrape summary`; it holds figures for the code, never a job record. */
export const departmentFileSchema = z.strictObject({
  profile: z.strictObject({
    code: z.string(),
    name: z.string(),
    otherNames: z.array(z.string()),
    aliasCodes: z.array(z.string()),
    isArea: z.boolean(),
    hasBudget: z.boolean(),
    hasJobs: z.boolean(),
    area: z.strictObject({ code: z.string(), name: z.string() }).nullable(),
  }),
  /** `null` when no budget publishes the code. */
  budget: z
    .strictObject({
      years: z.array(
        z.strictObject({ fiscalYear: year, period: budgetPeriodSchema }),
      ),
      total: yearValues,
      accountTypes: z.array(
        z.strictObject({
          accountType: twoDigitCode,
          name: z.string(),
          group: z.string(),
          values: yearValues,
        }),
      ),
      /** The total by account group, and by fund type. */
      series: z.strictObject({ account: series, fund: series }),
    })
    .nullable(),
  /** The censuses with at least one job, oldest first. */
  yearsWithJobs: z.array(year),
  /** `null` unless the code is an area. */
  placements: z
    .array(
      z.strictObject({
        year,
        fiscalYear: year,
        bases: z.strictObject({ published: count, name: count, hand: count }),
        unassignedSiteWide: count,
      }),
    )
    .nullable(),
  /** The jobs over the censuses with jobs, for every staff kind and for each. */
  trends: z.strictObject({
    all: trendsSchema,
    classified: trendsSchema,
    unclassified: trendsSchema,
  }),
  /** Each census with jobs: its ranks, then its position classes. */
  classes: z.array(
    z.strictObject({ year, unclassified: classRows, classified: classRows }),
  ),
})

export type DepartmentFile = z.infer<typeof departmentFileSchema>
export type DepartmentFileBudget = NonNullable<DepartmentFile['budget']>
