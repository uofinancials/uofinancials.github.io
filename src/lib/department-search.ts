import { z } from 'zod'
import { fiscalYearLabel } from '../data/budget.ts'
import { type StaffKind, staffKindSchema } from '../data/fall.ts'
import { BUDGET_BREAKDOWNS, type BudgetBreakdown } from './department-budget.ts'
import { TREND_METRICS, type TrendMetric } from './trends-search.ts'

const YEAR_END_PERIOD = '14'

/** The departments index's URL search params. */
export const departmentsSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
})

/** A department page's URL search params; a malformed value falls back to its default. */
export const departmentSearchSchema = z.object({
  budget: z.enum(BUDGET_BREAKDOWNS).optional().catch(undefined),
  metric: z.enum(TREND_METRICS).optional().catch(undefined),
  kind: staffKindSchema.optional().catch(undefined),
  year: z.number().int().optional().catch(undefined),
})

export type DepartmentSearch = z.infer<typeof departmentSearchSchema>

export type DepartmentView = {
  budget: BudgetBreakdown
  metric: TrendMetric
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
