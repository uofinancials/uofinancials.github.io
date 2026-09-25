import { z } from 'zod'

const nonBlank = z.string().min(1)
const isoDate = z.iso.date()
const percent = z.string().regex(/^\d+(\.\d+)?$/)

const termFields = {
  employeeGroup: z.enum([
    'United Academics',
    'SEIU 503',
    'Teamsters 206',
    'UOPA',
    'Officers of Administration',
  ]),
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
      kind: z.enum([
        'across-the-board',
        'merit-pool',
        'equity-pool',
        'longevity',
      ]),
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
