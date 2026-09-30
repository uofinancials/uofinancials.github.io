import { z } from 'zod'
import { budgetPeriodSchema } from './budget.ts'
import { staffKindSchema } from './fall.ts'

export const SALARY_REPORTS_PAGE =
  'https://data.uoregon.edu/employees/salary-reports'

const isoDate = z.iso.date()
const sha256 = z.string().regex(/^[0-9a-f]{64}$/)

const sourceFileSchema = z.strictObject({
  kind: staffKindSchema,
  fileName: z.string().min(1),
  sha256,
  pages: z.number().int().positive(),
  extractDate: isoDate,
  retrievedOn: isoDate,
  records: z.number().int().nonnegative(),
})

const fallEntrySchema = z.strictObject({
  year: z.number().int(),
  censusDate: isoDate,
  sourcePage: z.url(),
  files: z.array(sourceFileSchema),
})

const fetchedFileFields = {
  url: z.url(),
  sha256,
  lastModified: z.string().min(1).nullable(),
  retrievedOn: isoDate,
}

const budgetEntrySchema = z.strictObject({
  fiscalYear: z.number().int(),
  period: budgetPeriodSchema,
  sourcePage: z.url(),
  fileName: z.string().min(1),
  ...fetchedFileFields,
  rows: z.number().int().nonnegative(),
  totalExpenditureBudgetCents: z.number().int(),
})

const ratesEntrySchema = z.strictObject({
  pages: z.array(z.strictObject(fetchedFileFields)),
  groups: z.number().int().nonnegative(),
  opeRates: z.number().int().nonnegative(),
  leaveRates: z.number().int().nonnegative(),
  persRepayment: z.number().int().nonnegative(),
})

const summaryEntrySchema = z.strictObject({
  derivedOn: isoDate,
  /** The data files the summary was derived from, relative to the data directory. */
  files: z.array(z.string().min(1)),
})

export const manifestSchema = z.strictObject({
  fall: z.array(fallEntrySchema),
  budget: z.array(budgetEntrySchema),
  rates: ratesEntrySchema.nullable(),
  summary: summaryEntrySchema.nullable(),
})

export type FallEntry = z.infer<typeof fallEntrySchema>
export type BudgetEntry = z.infer<typeof budgetEntrySchema>
export type Manifest = z.infer<typeof manifestSchema>
