import { z } from 'zod'
import { citedSourceSchema } from './cited-source.ts'

const nonBlank = z.string().min(1)
const isoDate = z.iso.date()
const percent = z.string().regex(/^\d+(\.\d+)?$/)
const BASIS_POINT_PERCENT = /^\d+(\.\d{1,2})?$/
const basisPointPercent = z.string().regex(BASIS_POINT_PERCENT)

function basisPointsOf(percent: string): number {
  const [whole = '', fraction = ''] = percent.split('.')
  return Number(whole + fraction.padEnd(2, '0'))
}

const employeeGroupSchema = z.enum([
  'United Academics',
  'SEIU 503',
  'Teamsters 206',
  'UOPA',
  'Officers of Administration',
])

/** Each group's populations an across-the-board term can name; `all` is every one of them. */
export const GROUP_POPULATIONS = {
  'United Academics': [
    'tenure-related',
    'career-instructional',
    'career-research',
    'pro-tem',
  ],
  'SEIU 503': [],
  'Teamsters 206': [],
  UOPA: ['police-officers', 'dispatchers', 'community-service-officers'],
  'Officers of Administration': [],
} as const satisfies Record<
  z.infer<typeof employeeGroupSchema>,
  readonly string[]
>

const populationSchema = z.enum([
  'all',
  ...Object.values(GROUP_POPULATIONS).flat(),
])

const termFields = {
  employeeGroup: employeeGroupSchema,
  appliesTo: nonBlank,
  effectiveDate: isoDate.nullable(),
  note: nonBlank.nullable(),
  source: citedSourceSchema,
}

const raiseTermSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...termFields,
      kind: z.literal('across-the-board'),
      populations: z.array(populationSchema).min(1),
      effectiveBetween: z
        .strictObject({ from: isoDate, to: isoDate })
        .nullable(),
      percent: basisPointPercent,
      amountCents: z.null(),
    }),
    z.strictObject({
      ...termFields,
      kind: z.enum(['merit-pool', 'equity-pool']),
      populations: z.array(populationSchema).min(1),
      percent,
      amountCents: z.null(),
    }),
    z.strictObject({
      ...termFields,
      kind: z.literal('longevity'),
      percent,
      amountCents: z.null(),
    }),
    z.strictObject({
      ...termFields,
      kind: z.literal('step'),
      percent: percent.nullable(),
      amountCents: z.null(),
    }),
    z.strictObject({
      ...termFields,
      kind: z.literal('one-time'),
      percent: z.null(),
      amountCents: z.number().int().positive(),
    }),
  ])
  .refine((term) => term.effectiveDate !== null || term.note !== null, {
    message: 'a term without an effective date explains its timing in a note',
  })
  .refine(
    (term) =>
      !('populations' in term) ||
      term.populations.every(
        (population) =>
          population === 'all' ||
          GROUP_POPULATIONS[term.employeeGroup].some(
            (known) => known === population,
          ),
      ),
    { message: "a term names only its group's populations" },
  )
  .transform((term, context) => {
    if (term.kind !== 'across-the-board') {
      if (!('populations' in term)) return term
      return {
        ...term,
        basisPoints: BASIS_POINT_PERCENT.test(term.percent)
          ? basisPointsOf(term.percent)
          : null,
      }
    }
    const from = term.effectiveDate ?? term.effectiveBetween?.from
    const to = term.effectiveDate ?? term.effectiveBetween?.to
    if (!from || !to || (term.effectiveDate && term.effectiveBetween)) {
      context.issues.push({
        code: 'custom',
        input: term,
        message:
          'an across-the-board term has an effective date or, without one, the window it fell in',
      })
      return z.NEVER
    }
    return {
      ...term,
      basisPoints: basisPointsOf(term.percent),
      effective: { from, to },
    }
  })

export const raiseTermsSchema = z.strictObject({
  terms: z.array(raiseTermSchema),
  gaps: z.array(
    z.strictObject({
      employeeGroup: nonBlank,
      fiscalYears: nonBlank,
      note: nonBlank,
    }),
  ),
})

export type RaiseTerm = z.infer<typeof raiseTermSchema>
export type RaiseTerms = z.infer<typeof raiseTermsSchema>
export type EmployeeGroup = z.infer<typeof employeeGroupSchema>
export type Population = z.infer<typeof populationSchema>
export type AcrossTheBoardTerm = Extract<
  RaiseTerm,
  { kind: 'across-the-board' }
>
/** A merit or equity pool; `basisPoints` is `null` when its percent is finer than a basis point. */
export type PoolTerm = Extract<
  RaiseTerm,
  { kind: 'merit-pool' | 'equity-pool' }
>
