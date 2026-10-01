import type { BudgetYear } from '../../data/budget.ts'
import type { DepartmentFile } from '../../data/department.ts'
import type { FyTemps } from '../../data/fy-temps.ts'
import { departmentBudget } from './budget.ts'
import { departmentCodes, describeCode } from './codes.ts'
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
  const byAccount = departmentBudget(code, budgets, 'account')
  return {
    profile,
    budget: profile.hasBudget
      ? {
          years: byAccount.years,
          total: byAccount.total,
          accountTypes: byAccount.accountTypes,
          series: {
            account: byAccount.series,
            fund: departmentBudget(code, budgets, 'fund').series,
          },
        }
      : null,
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

/** Every department page's figures, one file per code a budget or a census publishes. */
export function buildDepartmentFiles(
  inputs: DepartmentInputs,
): DepartmentFile[] {
  return departmentCodes(inputs.censuses, inputs.budgets).map((code) =>
    buildDepartmentFile(code, inputs),
  )
}
