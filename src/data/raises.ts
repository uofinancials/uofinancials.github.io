import { z } from 'zod'

const nonBlank = z.string().min(1)

export const raiseTermsSchema = z.strictObject({
  terms: z.array(
    z
      .strictObject({
        employeeGroup: z.enum([
          'United Academics',
          'SEIU 503',
          'Teamsters 206',
          'UOPA',
          'Officers of Administration',
        ]),
        appliesTo: nonBlank,
        kind: z.enum([
          'across-the-board',
          'merit-pool',
          'step',
          'equity-pool',
          'longevity',
          'one-time',
        ]),
        percent: z
          .string()
          .regex(/^\d+(\.\d+)?$/)
          .nullable(),
        amountCents: z.number().int().positive().nullable(),
        effectiveDate: z.iso.date().nullable(),
        note: nonBlank.nullable(),
        source: z.strictObject({
          url: z.url(),
          document: nonBlank,
          location: nonBlank,
          retrievedOn: z.iso.date(),
        }),
      })
      .refine(
        (term) => (term.kind === 'one-time') === (term.amountCents !== null),
        {
          message: 'one-time terms carry an amount, and only they do',
        },
      )
      .refine(
        (term) =>
          term.kind === 'one-time' ||
          term.kind === 'step' ||
          term.percent !== null,
        {
          message: 'percentage terms carry a percent',
        },
      )
      .refine((term) => term.effectiveDate !== null || term.note !== null, {
        message:
          'a term without an effective date explains its timing in a note',
      }),
  ),
  gaps: z.array(
    z.strictObject({
      employeeGroup: nonBlank,
      fiscalYears: nonBlank,
      note: nonBlank,
    }),
  ),
})

export type RaiseTerms = z.infer<typeof raiseTermsSchema>
