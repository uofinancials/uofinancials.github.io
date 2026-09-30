import { z } from 'zod'
import { positionClassSchema, staffKindSchema } from './fall.ts'

const isoDate = z.iso.date()
const nonBlank = z.string().min(1)

const fyCommon = {
  name: nonBlank,
  jobType: z.enum(['Primary', 'Secondary', 'Overload']),
  /** As of June 30, the fiscal year's last day. */
  jobStatus: nonBlank,
  jobStartDate: isoDate,
  jobEndDate: isoDate.nullable(),
  /** Department names only: the FY reports publish no codes. */
  homeDepartment: nonBlank,
  /** Published as `PAY DEPARTMENT`, or `TMSHT DEPARTMENT` from FY2025-26. */
  payDepartment: nonBlank,
  positionClass: positionClassSchema,
  termOfServiceMonths: z.union([z.literal(9), z.literal(12)]).nullable(),
  /** Paid in the fiscal year for the job and department; negative where UO prints it in parentheses. */
  totalPayCents: z.number().int(),
  sourcePage: z.number().int().positive(),
}

const fyClassifiedSchema = z.strictObject({
  kind: z.literal(staffKindSchema.enum.classified),
  ...fyCommon,
  jobTitle: nonBlank,
})

const fyUnclassifiedSchema = z.strictObject({
  kind: z.literal(staffKindSchema.enum.unclassified),
  ...fyCommon,
  /** Published as `ACADEMIC TITLE`, or `POSITION TITLE` from FY2025-26. */
  academicTitle: nonBlank,
  oaSalaryGrade: nonBlank.nullable(),
})

export const fyRecordSchema = z.discriminatedUnion('kind', [
  fyClassifiedSchema,
  fyUnclassifiedSchema,
])

export const fyYearSchema = z.strictObject({
  /** The year the fiscal year ends in, as in the budget files: FY2020-21 is 2021. */
  fiscalYear: z.number().int(),
  records: z.array(fyRecordSchema),
})

export type FyRecord = z.infer<typeof fyRecordSchema>
export type FyYear = z.infer<typeof fyYearSchema>
