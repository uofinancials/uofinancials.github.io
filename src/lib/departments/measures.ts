import { fiscalYearLabel } from '../../data/budget.ts'
import type { TableYear } from '../../data/summary.ts'
import type { DepartmentRow } from './table.ts'

/** The figures that add up across rows, so one can size a row against the rest. */
export const SIZE_MEASURES = ['budget', 'spend', 'jobs'] as const
export type SizeMeasure = (typeof SIZE_MEASURES)[number]

export const SIZE_NOUNS: Record<SizeMeasure, string> = {
  budget: 'budget',
  spend: 'salary spend',
  jobs: 'jobs',
}

/** A row's figure for the measure: cents for budget and spend, a count for jobs. */
export function sizeOf(
  row: Pick<DepartmentRow, 'budgetCents' | 'spendCents' | 'jobs'>,
  measure: SizeMeasure,
): number | null {
  return { budget: row.budgetCents, spend: row.spendCents, jobs: row.jobs }[
    measure
  ]
}

/** Each measure's year as the table's columns have it: the budget's fiscal year, the others' census. */
export function sizeYears({
  year,
  fiscalYear,
}: TableYear): Record<SizeMeasure, string> {
  const census = `Fall ${year}`
  return { budget: fiscalYearLabel(fiscalYear), spend: census, jobs: census }
}

/** Each measure named with its year, e.g. `FY26 budget`. */
export function sizeLabels(tableYear: TableYear): Record<SizeMeasure, string> {
  const years = sizeYears(tableYear)
  return {
    budget: `${years.budget} ${SIZE_NOUNS.budget}`,
    spend: `${years.spend} ${SIZE_NOUNS.spend}`,
    jobs: `${years.jobs} ${SIZE_NOUNS.jobs}`,
  }
}
