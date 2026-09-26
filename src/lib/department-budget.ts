import type { BudgetRow, BudgetYear } from '../data/budget.ts'
import {
  ACCOUNT_GROUPS,
  type AccountGroup,
  accountGroupOf,
} from './account-groups.ts'
import { ORG_LEVEL_AREA } from './areas.ts'

export const BUDGET_BREAKDOWNS = ['account', 'fund'] as const
export type BudgetBreakdown = (typeof BUDGET_BREAKDOWNS)[number]

/** Cents per fiscal year, aligned with `DepartmentBudget.years`; `null` where the code is not in that year's hierarchy. */
export type YearValues = (number | null)[]

export type DepartmentBudget = {
  years: { fiscalYear: number; period: string }[]
  /** One per account group, or per fund type, that has a row. */
  series: { key: string; values: YearValues }[]
  accountTypes: {
    accountType: string
    name: string
    group: AccountGroup
    values: YearValues
  }[]
  total: YearValues
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

/** Total Expenditure Budget cents per key. */
export function sumBy(
  rows: BudgetRow[],
  keyOf: (row: BudgetRow) => string,
): Map<string, number> {
  const sums = new Map<string, number>()
  for (const row of rows) {
    const key = keyOf(row)
    sums.set(key, (sums.get(key) ?? 0) + row.totalExpenditureBudgetCents)
  }
  return sums
}

function seriesKeyOf(
  budget: BudgetYear,
  by: BudgetBreakdown,
): (row: BudgetRow) => string {
  if (by === 'account') {
    return (row) => accountGroupOf(row.accountType, budget.fiscalYear)
  }
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
  bySeries: Map<string, number>
  byAccountType: Map<string, number>
  total: number
}

function sumYear(
  budget: BudgetYear,
  units: Set<string>,
  by: BudgetBreakdown,
): YearSums {
  const rows = budget.rows.filter((row) => units.has(row.org))
  return {
    bySeries: sumBy(rows, seriesKeyOf(budget, by)),
    byAccountType: sumBy(rows, (row) => row.accountType),
    total: rows.reduce((sum, row) => sum + row.totalExpenditureBudgetCents, 0),
  }
}

/** A code's Total Expenditure Budget per fiscal year, as published, broken down by account group or fund type. */
export function departmentBudget(
  code: string,
  budgets: BudgetYear[],
  by: BudgetBreakdown,
): DepartmentBudget {
  const sorted = [...budgets].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const accountNames = new Map<string, { name: string; group: AccountGroup }>()
  const perYear = sorted.map((budget) => {
    const units = unitsOf(code, budget.orgs)
    if (!units) return null
    const sums = sumYear(budget, units, by)
    for (const accountType of sums.byAccountType.keys()) {
      accountNames.set(accountType, {
        name: budget.accountTypes[accountType] ?? accountType,
        group: accountGroupOf(accountType, budget.fiscalYear),
      })
    }
    return sums
  })
  const valuesOf = (pick: (sums: YearSums) => number): YearValues =>
    perYear.map((sums) => (sums ? pick(sums) : null))
  return {
    years: sorted.map(({ fiscalYear, period }) => ({ fiscalYear, period })),
    series: orderKeys(
      perYear.flatMap((sums) => [...(sums?.bySeries.keys() ?? [])]),
      by,
    ).map((key) => ({
      key,
      values: valuesOf((sums) => sums.bySeries.get(key) ?? 0),
    })),
    accountTypes: [...accountNames]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([accountType, { name, group }]) => ({
        accountType,
        name,
        group,
        values: valuesOf((sums) => sums.byAccountType.get(accountType) ?? 0),
      })),
    total: valuesOf((sums) => sums.total),
  }
}
