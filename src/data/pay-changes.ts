import { z } from 'zod'
import { staffKindSchema } from './fall.ts'

const index = z.number().int().nonnegative()
const cents = z.number().int().positive()

/** One array per field, a pair per position; an index column points into the file's list for it. */
const columnsSchema = z.strictObject({
  /** The earlier census of the pair. */
  fromYear: z.array(z.number().int()),
  kind: z.array(index),
  dept: z.array(index.nullable()),
  area: z.array(index.nullable()),
  group: z.array(index),
  category: z.array(index.nullable()),
  peer: z.array(index.nullable()),
  raise: z.array(index.nullable()),
  fromCents: z.array(cents),
  toCents: z.array(cents),
  /** `null` for a pair of unclassified jobs. */
  isClassChanged: z.array(z.boolean().nullable()),
  /** `null` for a pair of classified jobs. */
  rank: z.array(index.nullable()),
  isTitleChanged: z.array(z.boolean()),
})

const code = z.string().min(1)

/**
 * Every continuing job's pair of consecutive censuses, without a name: what
 * its earlier job is grouped by, its two published annual salary rates, and
 * what changed. The department, area, and class or rank lists also hold the
 * name each reads by, for every one a census or budget publishes. Written by
 * `pnpm scrape summary`.
 */
export const payChangesFileSchema = z
  .strictObject({
    depts: z.array(z.strictObject({ code, name: z.string().min(1) })),
    areas: z.array(z.strictObject({ code, name: z.string().min(1) })),
    /** `peerGroupOf` keys and labels. */
    peers: z.array(z.strictObject({ key: code, label: z.string().min(1) })),
    kinds: z.array(staffKindSchema),
    groups: z.array(z.string().min(1)),
    /** EEO categories as published. */
    categories: z.array(z.string().min(1)),
    /** Raise row labels. */
    raises: z.array(z.string().min(1)),
    ranks: z.array(z.enum(['same', 'renamed', 'changed', 'unpublished'])),
    pairs: columnsSchema,
  })
  .superRefine((file, context) => {
    const length = file.pairs.fromYear.length
    for (const [column, cells] of Object.entries(file.pairs)) {
      if (cells.length !== length) {
        context.addIssue({
          code: 'custom',
          message: `Column ${column} has ${cells.length} pairs, not ${length}`,
        })
      }
    }
    const { pairs } = file
    const pointers: [string, (number | null)[], unknown[]][] = [
      ['kind', pairs.kind, file.kinds],
      ['dept', pairs.dept, file.depts],
      ['area', pairs.area, file.areas],
      ['group', pairs.group, file.groups],
      ['category', pairs.category, file.categories],
      ['peer', pairs.peer, file.peers],
      ['raise', pairs.raise, file.raises],
      ['rank', pairs.rank, file.ranks],
    ]
    for (const [column, cells, list] of pointers) {
      if (cells.some((cell) => cell !== null && cell >= list.length)) {
        context.addIssue({
          code: 'custom',
          message: `Column ${column} points past its list of ${list.length}`,
        })
      }
    }
  })

export type PayChangesFile = z.infer<typeof payChangesFileSchema>
