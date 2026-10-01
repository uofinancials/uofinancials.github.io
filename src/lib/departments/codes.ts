import type { BudgetYear } from '../../data/budget.ts'
import type { DepartmentFile } from '../../data/department.ts'
import type { FallRecord } from '../../data/fall.ts'
import { aliasCodesOf } from '../../data/unit-aliases.ts'
import { listAreas, ORG_LEVEL_AREA } from '../census/areas.ts'
import { UNASSIGNED_AREA } from '../census/totals.ts'
import { type DepartmentCensus, isAreaCode, placementIndexOf } from './jobs.ts'

/** A unit or pay department, the area it sits in, and the jobs paid under its code. */
export type PlacedUnit = {
  code: string
  name: string
  area: string | null
  records: FallRecord[]
}

/** An area and the units and pay departments in it; `code` is `null` for pay departments no area was assigned. */
export type IndexArea = {
  code: string | null
  name: string
  entries: { code: string; name: string }[]
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name)
}

/**
 * Every unit the census's budget publishes, then each pay department it does
 * not, each with the jobs paid under its code. A pay department with an area's
 * code is that area's; one published under several names, or placed in several
 * areas, keeps its first record's.
 */
export function placeUnits(census: DepartmentCensus): PlacedUnit[] {
  const { orgs, assign } = census
  const { byCode } = placementIndexOf(census)
  const units: PlacedUnit[] = []
  for (const [code, org] of Object.entries(orgs)) {
    if (org.level === ORG_LEVEL_AREA) continue
    const records = byCode.get(code) ?? []
    units.push({ code, name: org.name, area: org.parent, records })
  }
  for (const [code, records] of byCode) {
    const [first] = records
    if (code === null || !first || orgs[code]) continue
    const { name } = first.payDepartment
    units.push({ code, name, area: assign(first).area, records })
  }
  return units
}

/** Each area with the jobs placed in it, then the jobs placed in none, when there are any. */
export function placedAreas(
  census: DepartmentCensus,
): { code: string | null; name: string; records: FallRecord[] }[] {
  const { byArea, unassigned } = placementIndexOf(census)
  return [
    ...listAreas(census.orgs).map(({ code, name }) => ({
      code,
      name,
      records: byArea.get(code)?.records ?? [],
    })),
    ...(unassigned.length > 0
      ? [{ code: null, name: UNASSIGNED_AREA, records: unassigned }]
      : []),
  ]
}

/** The areas of a census's budget year, each with its units and the pay departments placed in it. */
export function departmentIndex(census: DepartmentCensus): IndexArea[] {
  const units = placeUnits(census)
  return placedAreas(census).map(({ code, name }) => ({
    code,
    name,
    entries: units
      .filter((unit) => unit.area === code)
      .map(({ code: unitCode, name }) => ({ code: unitCode, name }))
      .sort(byName),
  }))
}

export type CodeProfile = DepartmentFile['profile']

function containingArea(
  code: string,
  placedJobs: { census: DepartmentCensus; record: FallRecord }[],
  budgets: BudgetYear[],
): CodeProfile['area'] {
  for (const { orgs } of budgets) {
    const parent = orgs[code]?.parent
    const name = parent ? orgs[parent]?.name : undefined
    if (parent && name) return { code: parent, name }
  }
  for (const { census, record } of placedJobs) {
    const { area } = census.assign(record)
    const name = area ? census.orgs[area]?.name : undefined
    if (area && name) return { code: area, name }
  }
  return null
}

/** Every code with a department page: each budget's units and areas, and each census's pay codes, sorted. */
export function departmentCodes(
  censuses: { records: FallRecord[] }[],
  budgets: { orgs: BudgetYear['orgs'] }[],
): string[] {
  const codes = new Set(budgets.flatMap(({ orgs }) => Object.keys(orgs)))
  for (const { records } of censuses) {
    for (const { payDepartment } of records) {
      if (payDepartment.code !== null) codes.add(payDepartment.code)
    }
  }
  return [...codes].sort()
}

/** What the sources publish under a code; `null` when neither publishes it. */
export function describeCode(
  code: string,
  censuses: DepartmentCensus[],
  budgets: BudgetYear[],
): CodeProfile | null {
  const newestBudgets = [...budgets].sort((a, b) => b.fiscalYear - a.fiscalYear)
  const jobs = [...censuses]
    .sort((a, b) => b.year - a.year)
    .flatMap((census) => {
      const [record] = placementIndexOf(census).byCode.get(code) ?? []
      return record ? [{ census, record }] : []
    })
  const budgetNames = newestBudgets.flatMap(
    ({ orgs }) => orgs[code]?.name ?? [],
  )
  const censusNames = jobs.map(({ record }) => record.payDepartment.name)
  const [name, ...rest] = [...new Set([...budgetNames, ...censusNames])]
  if (name === undefined) return null
  const isArea = isAreaCode(code, budgets)
  return {
    code,
    name,
    otherNames: rest,
    aliasCodes: aliasCodesOf(code),
    isArea,
    area: isArea ? null : containingArea(code, jobs, newestBudgets),
  }
}
