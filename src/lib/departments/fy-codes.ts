import type { BudgetYear } from '../../data/budget.ts'
import type { FallYear } from '../../data/fall.ts'
import { FY_DEPARTMENTS } from '../../data/fy-departments.ts'
import { fiscalYearOf } from '../census/totals.ts'

/** Where an FY department name's code came from; the site's join, not UO's. */
export type FyDepartmentCode =
  | { basis: 'reviewed' | 'census' | 'budget' | 'nearby census'; code: string }
  | { basis: 'unresolved'; codes: string[] }

export type FyCodeSources = {
  falls: FallYear[]
  budgets: Pick<BudgetYear, 'fiscalYear' | 'orgs'>[]
}

type CodesByName = Map<string, Set<string>>

const REVIEWED = new Map(FY_DEPARTMENTS.map(({ name, code }) => [name, code]))

function addCode(byName: CodesByName, name: string, code: string): void {
  byName.set(name, (byName.get(name) ?? new Set()).add(code))
}

function payDepartmentCodes(falls: FallYear[]): CodesByName {
  const byName: CodesByName = new Map()
  for (const { records } of falls) {
    for (const { payDepartment } of records) {
      if (payDepartment.code) {
        addCode(byName, payDepartment.name, payDepartment.code)
      }
    }
  }
  return byName
}

function orgCodes(budgets: FyCodeSources['budgets']): CodesByName {
  const byName: CodesByName = new Map()
  for (const { orgs } of budgets) {
    for (const [code, { name }] of Object.entries(orgs)) {
      addCode(byName, name, code)
    }
  }
  return byName
}

/**
 * A resolver for one fiscal year's department names: the pay departments of
 * the Fall census inside the year, then the year's budget orgs, then the
 * censuses either side, then the reviewed table. A name the first source that
 * knows it gives two codes goes straight to the table.
 */
export function createFyCodeResolver(
  fiscalYear: number,
  { falls, budgets }: FyCodeSources,
): (name: string) => FyDepartmentCode {
  const fallsIn = (years: number[]) =>
    falls.filter(({ censusDate }) => years.includes(fiscalYearOf(censusDate)))
  const sources = [
    ['census', payDepartmentCodes(fallsIn([fiscalYear]))],
    [
      'budget',
      orgCodes(budgets.filter((budget) => budget.fiscalYear === fiscalYear)),
    ],
    [
      'nearby census',
      payDepartmentCodes(fallsIn([fiscalYear - 1, fiscalYear + 1])),
    ],
  ] as const
  return (name) => {
    for (const [basis, byName] of sources) {
      const [code, ...others] = byName.get(name) ?? []
      if (code === undefined) continue
      if (others.length === 0) return { basis, code }
      return reviewedOr(name, [code, ...others])
    }
    return reviewedOr(name, [])
  }
}

function reviewedOr(name: string, codes: string[]): FyDepartmentCode {
  const code = REVIEWED.get(name)
  return code === undefined
    ? { basis: 'unresolved', codes: codes.sort() }
    : { basis: 'reviewed', code }
}
