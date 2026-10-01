import { z } from 'zod'
import { budgetPeriodSchema, twoDigitCode } from './budget.ts'
import { areaSchema, trendPointSchema, trendsSchema } from './summary.ts'

const year = z.number().int()
const count = z.number().int().nonnegative()
/** Cents per fiscal year; `null` where the code is not in that year's budget. */
const yearValues = z.array(z.number().int().nullable())
const series = z.array(z.strictObject({ key: z.string(), values: yearValues }))
/** A position class or rank row; spend and median as a trend point has them. */
const classRows = z.array(
  trendPointSchema.omit({ year: true }).extend({ label: z.string() }),
)

/** One code's department page, written by `pnpm scrape summary`; it holds figures for the code, never a job record. */
export const departmentFileSchema = z.strictObject({
  /** What the sources publish under the code. */
  profile: z.strictObject({
    code: z.string(),
    /** The latest published name: the budget's where it has one, else the census's. */
    name: z.string(),
    otherNames: z.array(z.string()),
    /** Codes the census also published this unit's jobs under, joined by hand review. */
    aliasCodes: z.array(z.string()),
    isArea: z.boolean(),
    /** The area a unit or pay department sits in, as of the latest year that places it. */
    area: areaSchema.nullable(),
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
      series: z.strictObject({ account: series, fund: series }),
    })
    .nullable(),
  /** The censuses with at least one job, oldest first. */
  yearsWithJobs: z.array(year),
  /** For an area, how its jobs were placed in each census, and the jobs left unplaced site-wide; `null` for any other code. */
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
