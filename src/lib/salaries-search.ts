import { z } from 'zod'
import { staffKindSchema } from '../data/fall.ts'
import { type JobFilter, TERMS } from './salary-distribution.ts'
import { TREND_GROUPS } from './trend-groups.ts'

const ORG_CODE = /^[0-9A-Z]{6}$/

/** The salaries page's URL search params; a malformed value falls back to its default. */
export const salariesSearchSchema = z.object({
  year: z.number().int().optional().catch(undefined),
  group: z.enum(TREND_GROUPS).optional().catch(undefined),
  kind: staffKindSchema.optional().catch(undefined),
  term: z
    .union([z.literal(TERMS[0]), z.literal(TERMS[1])])
    .optional()
    .catch(undefined),
  dept: z.string().regex(ORG_CODE).optional().catch(undefined),
})

export type SalariesSearch = z.infer<typeof salariesSearchSchema>

export type SalariesView = JobFilter & { year: number; dept: string | null }

/** The view a search asks for; a census not listed falls back to the latest. */
export function resolveSalariesView(
  search: SalariesSearch,
  years: number[],
): SalariesView {
  const latest = Math.max(...years)
  return {
    year:
      search.year !== undefined && years.includes(search.year)
        ? search.year
        : latest,
    group: search.group ?? null,
    kind: search.kind ?? 'all',
    term: search.term ?? null,
    dept: search.dept ?? null,
  }
}
