import { z } from 'zod'

const nonBlank = z.string().min(1)
const isoDate = z.iso.date()
const percent = z.string().regex(/^\d+(\.\d+)?$/)
const basisPointPercent = z.string().regex(/^\d+(\.\d{1,2})?$/)

function basisPointsOf(percent: string): number {
  const [whole = '', fraction = ''] = percent.split('.')
  return Number(whole + fraction.padEnd(2, '0'))
}

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
} as const

const employeeGroupSchema = z.enum([
  'United Academics',
  'SEIU 503',
  'Teamsters 206',
  'UOPA',
  'Officers of Administration',
])

const populationSchema = z.enum([
  'all',
  ...Object.values(GROUP_POPULATIONS).flat(),
])

const termFields = {
  employeeGroup: employeeGroupSchema,
  appliesTo: nonBlank,
  effectiveDate: isoDate.nullable(),
  note: nonBlank.nullable(),
  source: z.strictObject({
    url: z.url(),
    document: nonBlank,
    location: nonBlank,
    retrievedOn: isoDate,
  }),
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
      kind: z.enum(['merit-pool', 'equity-pool', 'longevity']),
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
      term.kind !== 'across-the-board' ||
      (term.effectiveDate === null) !== (term.effectiveBetween === null),
    {
      message:
        'an across-the-board term has an effective date or, without one, the window it fell in',
    },
  )
  .refine(
    (term) =>
      term.kind !== 'across-the-board' ||
      term.populations.every(
        (population) =>
          population === 'all' ||
          GROUP_POPULATIONS[term.employeeGroup].some(
            (known) => known === population,
          ),
      ),
    { message: "an across-the-board term names only its group's populations" },
  )
  .transform((term) =>
    term.kind === 'across-the-board'
      ? { ...term, basisPoints: basisPointsOf(term.percent) }
      : term,
  )

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
export type EmployeeGroup = z.infer<typeof employeeGroupSchema>
export type AcrossTheBoardTerm = Extract<
  RaiseTerm,
  { kind: 'across-the-board' }
>
