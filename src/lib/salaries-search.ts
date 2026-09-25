import { z } from 'zod'
import { type BudgetYear, orgCodeParam } from '../data/budget.ts'
import { type FallRecord, staffKindSchema } from '../data/fall.ts'
import { describeCode } from './department-index.ts'
import { type DepartmentCensus, departmentYears } from './department-jobs.ts'
import { type JobFilter, TERMS } from './salary-distribution.ts'
import { TREND_GROUPS } from './trend-groups.ts'

/** The salaries page's URL search params; a malformed value falls back to its default. */
export const salariesSearchSchema = z.object({
  year: z.number().int().optional().catch(undefined),
  group: z.enum(TREND_GROUPS).optional().catch(undefined),
  kind: staffKindSchema.optional().catch(undefined),
  term: z.literal(TERMS).optional().catch(undefined),
  dept: orgCodeParam.optional().catch(undefined),
  position: z.string().min(1).optional().catch(undefined),
})

export type SalariesSearch = z.infer<typeof salariesSearchSchema>

export type SalariesView = JobFilter & { year: number; dept: string | null }

/** The listed census a search asks for, or else the latest. */
export function resolveCensusYear(
  year: number | undefined,
  years: number[],
): number {
  return year !== undefined && years.includes(year) ? year : Math.max(...years)
}

/** The view a search asks for; a census not listed falls back to the latest. */
export function resolveSalariesView(
  search: SalariesSearch,
  years: number[],
): SalariesView {
  return {
    year: resolveCensusYear(search.year, years),
    group: search.group ?? null,
    kind: search.kind ?? 'all',
    term: search.term ?? null,
    dept: search.dept ?? null,
    position: search.position ?? null,
  }
}

/** What the view's `dept` code names in its census. */
export type Place =
  | { scope: 'all' }
  | { scope: 'area' | 'department'; code: string; name: string }
  | { scope: 'unknown'; code: string }

export function describePlace(
  dept: string | null,
  census: DepartmentCensus,
  budget: BudgetYear,
): Place {
  if (dept === null) return { scope: 'all' }
  const profile = describeCode(dept, [census], [budget])
  if (!profile) return { scope: 'unknown', code: dept }
  return {
    scope: profile.isArea ? 'area' : 'department',
    code: dept,
    name: profile.name,
  }
}

/** The census's jobs in a department or area, or all of them when none is chosen. */
export function placeJobs(
  census: DepartmentCensus,
  dept: string | null,
): FallRecord[] {
  if (dept === null) return census.records
  return departmentYears(dept, [census]).years[0]?.records ?? []
}
