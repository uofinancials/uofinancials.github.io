import { z } from 'zod'
import { fallRecordSchema } from './fall.ts'
import { foldUnitAliases } from './unit-aliases.ts'

const name = z.string().min(1)

const personYearSchema = z.strictObject({
  year: z.number().int(),
  censusDate: z.iso.date(),
  records: z.array(fallRecordSchema).min(1),
})

/** The people whose shown name is filed in one bucket, with their records as the Fall files publish them; written by `pnpm scrape summary`. */
export const personBucketSchema = z.strictObject({
  people: z.array(
    z.strictObject({
      name,
      /** The other names this person's records were published under. */
      otherNames: z.array(name).min(1).optional(),
      /** Census years with their records, split where no person link joins one year to the next. */
      runs: z.array(z.array(personYearSchema).min(1)).min(1),
    }),
  ),
  /** Each other name filed in this bucket, to the name its person is shown under. */
  joined: z.record(name, name),
})

export type PersonBucket = z.infer<typeof personBucketSchema>

/** A bucket as the site reads it, with unit aliases folded. */
export const foldedPersonBucketSchema = personBucketSchema.transform(
  (bucket): PersonBucket => ({
    ...bucket,
    people: bucket.people.map((person) => ({
      ...person,
      runs: person.runs.map((run) =>
        run.map((year) => ({ ...year, ...foldUnitAliases(year) })),
      ),
    })),
  }),
)
