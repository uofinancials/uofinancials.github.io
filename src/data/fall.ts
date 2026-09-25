import { z } from 'zod'

export const staffKindSchema = z.enum(['classified', 'unclassified'])

const isoDate = z.iso.date()
const nonBlank = z.string().min(1)

const department = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/)
    .nullable(),
  name: nonBlank,
})

const fallCommon = {
  name: nonBlank,
  jobType: z.enum(['Primary', 'Secondary', 'Overload']),
  jobStatus: nonBlank,
  jobStartDate: isoDate,
  jobEndDate: isoDate.nullable(),
  homeDepartment: department,
  payDepartment: department,
  annualSalaryRateCents: z.number().int().positive(),
  apptPercent: z.number().int().min(0).max(100),
  termOfServiceMonths: z.union([z.literal(9), z.literal(12)]),
  eeoCategory: nonBlank.nullable(),
  sourcePage: z.number().int().positive(),
  possibleStudent: z.boolean(),
}

const fallClassifiedSchema = z.strictObject({
  kind: z.literal(staffKindSchema.enum.classified),
  ...fallCommon,
  jobTitle: nonBlank,
  positionClass: z
    .object({
      code: z.string().regex(/^[A-Z0-9]{5}$/),
      title: nonBlank.nullable(),
    })
    .nullable(),
})

const fallUnclassifiedSchema = z.strictObject({
  kind: z.literal(staffKindSchema.enum.unclassified),
  ...fallCommon,
  apptStatus: nonBlank.nullable(),
  rank: nonBlank.nullable(),
  rankDate: isoDate.nullable(),
  academicTitle: nonBlank,
  primaryActivity: nonBlank.nullable(),
  oaSalaryGrade: nonBlank.nullable(),
})

export const fallRecordSchema = z.discriminatedUnion('kind', [
  fallClassifiedSchema,
  fallUnclassifiedSchema,
])

export const fallYearSchema = z.strictObject({
  censusDate: isoDate,
  records: z.array(fallRecordSchema),
})

export type FallClassified = z.infer<typeof fallClassifiedSchema>
export type FallUnclassified = z.infer<typeof fallUnclassifiedSchema>
export type FallRecord = z.infer<typeof fallRecordSchema>
export type FallYear = z.infer<typeof fallYearSchema>
export type StaffKind = z.infer<typeof staffKindSchema>
