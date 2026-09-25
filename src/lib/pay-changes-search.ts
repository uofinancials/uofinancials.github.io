import { z } from 'zod'
import { orgCodeParam } from '../data/budget.ts'
import { staffKindSchema } from '../data/fall.ts'
import { resolveCensusYear } from './census-search.ts'
import type { PayChangeFilter } from './pay-changes.ts'

/** The pay changes page's URL search params; `pair` is the earlier census of the pair shown. A malformed value falls back to its default. */
export const payChangesSearchSchema = z.object({
  kind: staffKindSchema.optional().catch(undefined),
  dept: orgCodeParam.optional().catch(undefined),
  position: z.string().min(1).optional().catch(undefined),
  pair: z.number().int().optional().catch(undefined),
})

export type PayChangesSearch = z.infer<typeof payChangesSearchSchema>

export type PayChangesView = PayChangeFilter & { pair: number }

/** The view a search asks for; a pair year not listed falls back to the latest. */
export function resolvePayChangesView(
  search: PayChangesSearch,
  fromYears: number[],
): PayChangesView {
  return {
    kind: search.kind ?? 'all',
    dept: search.dept ?? null,
    position: search.position ?? null,
    pair: resolveCensusYear(search.pair, fromYears),
  }
}
