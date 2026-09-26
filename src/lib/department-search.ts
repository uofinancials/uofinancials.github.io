import { z } from 'zod'
import { fiscalYearLabel, orgCodeParam } from '../data/budget.ts'
import { type StaffKind, staffKindSchema } from '../data/fall.ts'
import { BUDGET_BREAKDOWNS, type BudgetBreakdown } from './department-budget.ts'
import { DEPARTMENT_SORTS, type DepartmentSort } from './department-table.ts'
import { SORT_DIRECTIONS, type SortDirection } from './sort.ts'
import { CENSUS_METRICS, type CensusMetric } from './trends-search.ts'

const YEAR_END_PERIOD = '14'

export const DEPARTMENT_LEVELS = ['areas', 'units'] as const
export type DepartmentLevel = (typeof DEPARTMENT_LEVELS)[number]

const tableSortFields = {
  sort: z.enum(DEPARTMENT_SORTS).optional().catch(undefined),
  dir: z.enum(SORT_DIRECTIONS).optional().catch(undefined),
}

/** The departments index's URL search params; a malformed value falls back to its default. */
export const departmentsSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  level: z.enum(DEPARTMENT_LEVELS).optional().catch(undefined),
  area: orgCodeParam.optional().catch(undefined),
  ...tableSortFields,
})

export type DepartmentsSearch = z.infer<typeof departmentsSearchSchema>

export type TableSort = { sort: DepartmentSort; dir: SortDirection }

/** A table's sort, budget largest first unless the search asks otherwise. */
function resolveSort({
  sort,
  dir,
}: {
  sort?: DepartmentSort
  dir?: SortDirection
}): TableSort {
  return { sort: sort ?? 'budget', dir: dir ?? 'desc' }
}

export type DepartmentsView = TableSort & {
  q: string
  level: DepartmentLevel
  /** The area the units view is narrowed to. */
  area: string | null
}

export function resolveDepartmentsView(
  search: DepartmentsSearch,
): DepartmentsView {
  return {
    q: search.q ?? '',
    level: search.level ?? 'areas',
    area: search.area ?? null,
    ...resolveSort(search),
  }
}

/** A department page's URL search params; a malformed value falls back to its default. */
export const departmentSearchSchema = z.object({
  budget: z.enum(BUDGET_BREAKDOWNS).optional().catch(undefined),
  metric: z.enum(CENSUS_METRICS).optional().catch(undefined),
  kind: staffKindSchema.optional().catch(undefined),
  year: z.number().int().optional().catch(undefined),
  ...tableSortFields,
})

export type DepartmentSearch = z.infer<typeof departmentSearchSchema>

export type DepartmentView = TableSort & {
  budget: BudgetBreakdown
  metric: CensusMetric
  kind: StaffKind | 'all'
  /** The census the class table shows; `null` when no census has jobs. */
  year: number | null
}

/** The view a search asks for; the class table's census falls back to the latest with jobs. */
export function resolveDepartmentView(
  search: DepartmentSearch,
  yearsWithJobs: number[],
): DepartmentView {
  const year =
    search.year !== undefined && yearsWithJobs.includes(search.year)
      ? search.year
      : (yearsWithJobs.at(-1) ?? null)
  return {
    budget: search.budget ?? 'account',
    metric: search.metric ?? 'spend',
    kind: search.kind ?? 'all',
    year,
    ...resolveSort(search),
  }
}

/** "FY25", or "FY26 (period 12)" for a year not yet at year-end. */
export function budgetYearLabel({
  fiscalYear,
  period,
}: {
  fiscalYear: number
  period: string
}): string {
  const label = fiscalYearLabel(fiscalYear)
  return period === YEAR_END_PERIOD
    ? label
    : `${label} (period ${Number(period)})`
}
