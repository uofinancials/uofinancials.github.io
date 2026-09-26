import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import { listAreas, ORG_LEVEL_AREA } from './areas.ts'
import { type DepartmentCensus, isAreaCode } from './department-jobs.ts'
import { UNASSIGNED_AREA } from './overview.ts'

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
 * One census placed in its areas: every unit the budget publishes, then each
 * pay department it does not, with their jobs, and each area's jobs, those
 * placed in none under `null`. A pay department with an area's code is that
 * area's.
 */
export function placeDepartments({ records, orgs, assign }: DepartmentCensus): {
  units: PlacedUnit[]
  areaJobs: Map<string | null, FallRecord[]>
} {
  const units = new Map<string, PlacedUnit>()
  for (const [code, org] of Object.entries(orgs)) {
    if (org.level === ORG_LEVEL_AREA) continue
    units.set(code, { code, name: org.name, area: org.parent, records: [] })
  }
  const areaJobs = new Map<string | null, FallRecord[]>()
  for (const record of records) {
    const { area } = assign(record)
    const placed = areaJobs.get(area) ?? []
    placed.push(record)
    areaJobs.set(area, placed)
    const { code, name } = record.payDepartment
    if (code === null || code === area) continue
    const unit = units.get(code) ?? { code, name, area, records: [] }
    unit.records.push(record)
    units.set(code, unit)
  }
  return { units: [...units.values()], areaJobs }
}

/** The areas of a census's budget year, each with its units and the pay departments placed in it. */
export function departmentIndex(census: DepartmentCensus): IndexArea[] {
  const { units, areaJobs } = placeDepartments(census)
  const areaCodes = [
    ...listAreas(census.orgs).map(({ code }) => code),
    ...(areaJobs.has(null) ? [null] : []),
  ]
  return areaCodes.map((code) => ({
    code,
    name: code === null ? UNASSIGNED_AREA : (census.orgs[code]?.name ?? code),
    entries: units
      .filter((unit) => unit.area === code)
      .map(({ code: unitCode, name }) => ({ code: unitCode, name }))
      .sort(byName),
  }))
}

export type CodeProfile = {
  code: string
  /** The latest published name: the budget's where it has one, else the census's. */
  name: string
  otherNames: string[]
  isArea: boolean
  hasBudget: boolean
  hasJobs: boolean
  /** The area a unit or pay department sits in, as of the latest year that places it. */
  area: { code: string; name: string } | null
}

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
      const record = census.records.find(
        (job) => job.payDepartment.code === code,
      )
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
    isArea,
    hasBudget: budgetNames.length > 0,
    hasJobs: isArea || jobs.length > 0,
    area: isArea ? null : containingArea(code, jobs, newestBudgets),
  }
}
