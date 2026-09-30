import type { BudgetYear } from '../../data/budget.ts'
import { censusYearOf, type FallYear } from '../../data/fall.ts'
import { FY_DEPARTMENTS } from '../../data/fy-departments.ts'

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
 * A resolver for one fiscal year's department names, by the reviewed table,
 * then the pay departments of the Fall census inside the year, the year's
 * budget orgs, and the censuses either side. A source that gives a name two
 * codes leaves it unresolved.
 */
export function createFyCodeResolver(
  fiscalYear: number,
  { falls, budgets }: FyCodeSources,
): (name: string) => FyDepartmentCode {
  const censusIn = fiscalYear - 1
  const fallsIn = (years: number[]) =>
    falls.filter(({ censusDate }) => years.includes(censusYearOf(censusDate)))
  const sources = [
    ['census', payDepartmentCodes(fallsIn([censusIn]))],
    [
      'budget',
      orgCodes(budgets.filter((budget) => budget.fiscalYear === fiscalYear)),
    ],
    [
      'nearby census',
      payDepartmentCodes(fallsIn([censusIn - 1, censusIn + 1])),
    ],
  ] as const
  return (name) => {
    const reviewed = REVIEWED.get(name)
    if (reviewed !== undefined) return { basis: 'reviewed', code: reviewed }
    for (const [basis, byName] of sources) {
      const [code, ...others] = byName.get(name) ?? []
      if (code === undefined) continue
      if (others.length > 0) {
        return { basis: 'unresolved', codes: [code, ...others].sort() }
      }
      return { basis, code }
    }
    return { basis: 'unresolved', codes: [] }
  }
}
