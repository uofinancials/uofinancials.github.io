import { z } from 'zod'

const nonBlank = z.string().min(1)
const fiscalYear = z.number().int().min(2000)
const basisPoints = z.number().int().nonnegative()

export const opeRatesSchema = z.strictObject({
  groups: z.array(
    z.strictObject({
      name: nonBlank,
      eclassCodes: z.array(z.string().regex(/^[A-Z]{2}$/)),
      accountCode: z.string().regex(/^\d+$/).nullable(),
      description: nonBlank,
    }),
  ),
  opeRates: z.array(
    z.strictObject({
      fiscalYear,
      group: nonBlank,
      basisPoints,
      source: z.enum(['history', 'current']),
    }),
  ),
  leaveRates: z.array(
    z.strictObject({
      fiscalYear,
      group: nonBlank,
      appliesTo: nonBlank.nullable(),
      basisPoints,
    }),
  ),
  persRepayment: z.array(
    z.strictObject({
      fundType: z.string().regex(/^\d{2}$/),
      description: nonBlank,
      fiscalYears: z.array(fiscalYear).min(1),
      basisPoints,
    }),
  ),
})

export type OpeRates = z.infer<typeof opeRatesSchema>
