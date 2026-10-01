import type { BudgetRow, BudgetYear } from '../../data/budget.ts'
import type { DepartmentFileBudget } from '../../data/department.ts'
import { ORG_LEVEL_AREA } from '../census/areas.ts'
import { groupBy } from '../shared/group.ts'
import {
  ACCOUNT_GROUPS,
  type AccountGroup,
  accountGroupOf,
} from './account-groups.ts'

export const BUDGET_BREAKDOWNS = ['account', 'fund'] as const
export type BudgetBreakdown = (typeof BUDGET_BREAKDOWNS)[number]

/** Whether the budget of the given fiscal year publishes the code, going by its total there. */
export function isBudgetedIn(
  budget: Pick<DepartmentFileBudget, 'years' | 'total'> | null,
  fiscalYear: number,
): boolean {
  if (!budget) return false
  const at = budget.years.findIndex((year) => year.fiscalYear === fiscalYear)
  return typeof budget.total[at] === 'number'
}

/** The level-5 units a code covers in one year: itself, or an area's units. */
export function unitsOf(
  code: string,
  orgs: BudgetYear['orgs'],
): Set<string> | null {
  const org = orgs[code]
  if (!org) return null
  if (org.level !== ORG_LEVEL_AREA) return new Set([code])
  return new Set(
    Object.entries(orgs)
      .filter(([, unit]) => unit.parent === code)
      .map(([unit]) => unit),
  )
}

/** Cents per key, of the Total Expenditure Budget unless `amountOf` picks another amount. */
export function sumBy(
  rows: BudgetRow[],
  keyOf: (row: BudgetRow) => string,
  amountOf: (row: BudgetRow) => number = (row) =>
    row.totalExpenditureBudgetCents,
): Map<string, number> {
  const sums = new Map<string, number>()
  for (const row of rows) {
    const key = keyOf(row)
    sums.set(key, (sums.get(key) ?? 0) + amountOf(row))
  }
  return sums
}

function fundTypeOf(budget: BudgetYear): (row: BudgetRow) => string {
  return (row) => {
    const fundType = budget.funds[row.fund]?.fundType ?? ''
    return budget.fundTypes[fundType] ?? fundType
  }
}

function orderKeys(keys: Iterable<string>, by: BudgetBreakdown): string[] {
  const order: readonly string[] = ACCOUNT_GROUPS
  return [...new Set(keys)].sort((a, b) =>
    by === 'account' ? order.indexOf(a) - order.indexOf(b) : a.localeCompare(b),
  )
}

type YearSums = {
  series: Record<BudgetBreakdown, Map<string, number>>
  byAccountType: Map<string, number>
  total: number
}

const rowsByOrg = new WeakMap<BudgetYear, Map<string, BudgetRow[]>>()

/** The units' rows, from the year's rows grouped by org once. */
function unitRows(budget: BudgetYear, units: Set<string>): BudgetRow[] {
  const byOrg = rowsByOrg.get(budget) ?? groupBy(budget.rows, (row) => row.org)
  rowsByOrg.set(budget, byOrg)
  return [...units].flatMap((unit) => byOrg.get(unit) ?? [])
}

function sumYear(budget: BudgetYear, units: Set<string>): YearSums {
  const rows = unitRows(budget, units)
  return {
    series: {
      account: sumBy(rows, (row) =>
        accountGroupOf(row.accountType, budget.fiscalYear),
      ),
      fund: sumBy(rows, fundTypeOf(budget)),
    },
    byAccountType: sumBy(rows, (row) => row.accountType),
    total: rows.reduce((sum, row) => sum + row.totalExpenditureBudgetCents, 0),
  }
}

/** A code's Total Expenditure Budget per fiscal year, as published, broken down by account group and by fund type; a year's values are `null` where the code is not in its hierarchy. */
export function departmentBudget(
  code: string,
  budgets: BudgetYear[],
): DepartmentFileBudget {
  const sorted = [...budgets].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const accountNames = new Map<string, { name: string; group: AccountGroup }>()
  const perYear = sorted.map((budget) => {
    const units = unitsOf(code, budget.orgs)
    if (!units) return null
    const sums = sumYear(budget, units)
    for (const accountType of sums.byAccountType.keys()) {
      accountNames.set(accountType, {
        name: budget.accountTypes[accountType] ?? accountType,
        group: accountGroupOf(accountType, budget.fiscalYear),
      })
    }
    return sums
  })
  const valuesOf = (pick: (sums: YearSums) => number) =>
    perYear.map((sums) => (sums ? pick(sums) : null))
  const seriesOf = (by: BudgetBreakdown) =>
    orderKeys(
      perYear.flatMap((sums) => [...(sums?.series[by].keys() ?? [])]),
      by,
    ).map((key) => ({
      key,
      values: valuesOf((sums) => sums.series[by].get(key) ?? 0),
    }))
  return {
    years: sorted.map(({ fiscalYear, period }) => ({ fiscalYear, period })),
    total: valuesOf((sums) => sums.total),
    accountTypes: [...accountNames]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([accountType, { name, group }]) => ({
        accountType,
        name,
        group,
        values: valuesOf((sums) => sums.byAccountType.get(accountType) ?? 0),
      })),
    series: { account: seriesOf('account'), fund: seriesOf('fund') },
  }
}
