import type { BudgetYear } from '../../data/budget.ts'
import type { DepartmentFile } from '../../data/department.ts'
import type { FyTemps } from '../../data/fy-temps.ts'
import { departmentBudget } from './budget.ts'
import { describeCode } from './codes.ts'
import {
  type DepartmentCensus,
  departmentClasses,
  departmentTrends,
  departmentYears,
} from './jobs.ts'

type DepartmentInputs = {
  censuses: DepartmentCensus[]
  budgets: BudgetYear[]
  fyTemps: FyTemps
}

function buildDepartmentFile(
  code: string,
  { censuses, budgets, fyTemps }: DepartmentInputs,
): DepartmentFile {
  const profile = describeCode(code, censuses, budgets)
  if (!profile) {
    throw new Error(`No budget or census publishes department code ${code}`)
  }
  const jobs = departmentYears(code, censuses)
  const budget = departmentBudget(code, budgets)
  return {
    profile,
    budget: budget.total.every((cents) => cents === null) ? null : budget,
    yearsWithJobs: jobs.yearsWithJobs,
    placements: jobs.placements,
    trends: {
      all: departmentTrends(jobs, 'all', fyTemps),
      classified: departmentTrends(jobs, 'classified', fyTemps),
      unclassified: departmentTrends(jobs, 'unclassified', fyTemps),
    },
    classes: jobs.yearsWithJobs.map((year) => ({
      year,
      ...departmentClasses(jobs, year),
    })),
  }
}

/** Each listed code's department page: its names, budget, jobs, and classes. */
export function buildDepartmentFiles(
  codes: string[],
  inputs: DepartmentInputs,
): DepartmentFile[] {
  return codes.map((code) => buildDepartmentFile(code, inputs))
}
