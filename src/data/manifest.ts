import { z } from 'zod'
import { staffKindSchema } from './fall.ts'

export const SALARY_REPORTS_PAGE =
  'https://data.uoregon.edu/employees/salary-reports'

const isoDate = z.iso.date()

const sourceFileSchema = z.strictObject({
  kind: staffKindSchema,
  fileName: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  pages: z.number().int().positive(),
  extractDate: isoDate,
  retrievedOn: isoDate,
  records: z.number().int().nonnegative(),
  possibleStudents: z.number().int().nonnegative(),
})

const fallEntrySchema = z.strictObject({
  year: z.number().int(),
  censusDate: isoDate,
  sourcePage: z.url(),
  files: z.array(sourceFileSchema),
})

export const manifestSchema = z.strictObject({
  fall: z.array(fallEntrySchema),
})

export type FallEntry = z.infer<typeof fallEntrySchema>
export type Manifest = z.infer<typeof manifestSchema>
