import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import { createAreaAssigner, listAreas, ORG_LEVEL_AREA } from './areas.ts'
import { sumBy } from './department-budget.ts'
import { type DepartmentCensus, isAreaCode } from './department-jobs.ts'
import { UNASSIGNED_AREA } from './overview.ts'

export type IndexEntry = {
  code: string
  name: string
  /** The unit's Total Expenditure Budget; `null` when the budget publishes no unit with this code. */
  budgetCents: number | null
  jobs: number
}

/** An area and the units and pay departments in it; `code` is `null` for pay departments no area was assigned. */
export type IndexArea = Omit<IndexEntry, 'code'> & {
  code: string | null
  entries: IndexEntry[]
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name)
}

type PlacedEntry = IndexEntry & { area: string | null }

function unitEntries(budget: BudgetYear): Map<string, PlacedEntry> {
  const unitCents = sumBy(budget.rows, (row) => row.org)
  const entries = new Map<string, PlacedEntry>()
  for (const [code, org] of Object.entries(budget.orgs)) {
    if (org.level === ORG_LEVEL_AREA) continue
    const budgetCents = unitCents.get(code) ?? 0
    entries.set(code, {
      code,
      name: org.name,
      budgetCents,
      jobs: 0,
      area: org.parent,
    })
  }
  return entries
}

/** The areas of one budget year, each with its units and the census's pay departments placed in it. */
export function departmentIndex(
  census: { year: number; records: FallRecord[] },
  budget: BudgetYear,
): IndexArea[] {
  const assign = createAreaAssigner(census.records, budget.orgs, census.year)
  const entries = unitEntries(budget)
  const areaJobs = new Map<string | null, number>()
  for (const record of census.records) {
    const { area } = assign(record)
    areaJobs.set(area, (areaJobs.get(area) ?? 0) + 1)
    const { code, name } = record.payDepartment
    if (code === null || code === area) continue
    const entry = entries.get(code) ?? {
      code,
      name,
      budgetCents: null,
      jobs: 0,
      area,
    }
    entries.set(code, { ...entry, jobs: entry.jobs + 1 })
  }
  const areaCodes = [
    ...listAreas(budget.orgs).map(({ code }) => code),
    ...(areaJobs.has(null) ? [null] : []),
  ]
  return areaCodes
    .map((code) => {
      const members = [...entries.values()]
        .filter((entry) => entry.area === code)
        .map(({ area: _area, ...entry }) => entry)
        .sort(byName)
      return {
        code,
        name:
          code === null ? UNASSIGNED_AREA : (budget.orgs[code]?.name ?? code),
        budgetCents:
          code === null
            ? null
            : members.reduce((sum, entry) => sum + (entry.budgetCents ?? 0), 0),
        jobs: areaJobs.get(code) ?? 0,
        entries: members,
      }
    })
    .sort((a, b) => (a.code === null ? 1 : b.code === null ? -1 : byName(a, b)))
}

/** Areas whose name or code contains the text keep every entry; others keep only the entries that do. */
export function filterIndex(areas: IndexArea[], text: string): IndexArea[] {
  const needle = text.trim().toLowerCase()
  if (needle === '') return areas
  const matches = (item: { code: string | null; name: string }) =>
    item.name.toLowerCase().includes(needle) ||
    (item.code ?? '').includes(needle)
  return areas.flatMap((area) => {
    if (matches(area)) return [area]
    const entries = area.entries.filter(matches)
    return entries.length === 0 ? [] : [{ ...area, entries }]
  })
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
