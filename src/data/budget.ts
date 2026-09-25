import { z } from 'zod'

const orgCode = z.string().regex(/^[0-9A-Z]{6}$/)
const twoDigitCode = z.string().regex(/^\d{2}$/)
const nonBlank = z.string().min(1)
const cents = z.number().int()

export const budgetPeriodSchema = z.string().regex(/^(0[1-9]|1[0-2]|14)$/)

const budgetRowSchema = z.strictObject({
  period: budgetPeriodSchema,
  org: orgCode,
  fund: orgCode,
  accountType: twoDigitCode,
  beginningBudgetCents: cents,
  permAdjustmentsCents: cents,
  permStrategicInitiativeCents: cents,
  totalPermBudgetCents: cents,
  carryForwardCents: cents,
  tempBudgetCents: cents,
  tempStrategicInitiativeCents: cents,
  totalTempBudgetCents: cents,
  totalExpenditureBudgetCents: cents,
})

export const budgetYearSchema = z.strictObject({
  fiscalYear: z.number().int(),
  period: budgetPeriodSchema,
  orgs: z.record(
    orgCode,
    z.strictObject({
      name: nonBlank,
      level: z.union([z.literal(3), z.literal(5)]),
      parent: orgCode.nullable(),
    }),
  ),
  funds: z.record(
    orgCode,
    z.strictObject({
      name: z.string(),
      fundType: twoDigitCode,
      fundGroup: twoDigitCode,
    }),
  ),
  fundTypes: z.record(twoDigitCode, nonBlank),
  accountTypes: z.record(twoDigitCode, nonBlank),
  rows: z.array(budgetRowSchema),
})

export type BudgetRow = z.infer<typeof budgetRowSchema>
export type BudgetYear = z.infer<typeof budgetYearSchema>
