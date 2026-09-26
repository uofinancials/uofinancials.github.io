import type { BudgetRow, BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import type { Manifest } from '../data/manifest.ts'
import { listAreas, ORG_LEVEL_AREA } from './areas.ts'
import { sumBy, unitsOf } from './department-budget.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { formatDollars } from './format.ts'
import {
  fiscalYearForCensus,
  SPEND_METHOD,
  UNASSIGNED_AREA,
} from './overview.ts'
import type { SortDirection } from './people-search.ts'
import { MIN_JOBS_SHOWN, measureJobs } from './trends.ts'

/** A census joined to the budget year that names its areas. */
export type TableYear = { census: DepartmentCensus; budget: BudgetYear }

export const FIGURE_COLUMNS = ['budget', 'jobs', 'spend', 'median'] as const
export type FigureColumn = (typeof FIGURE_COLUMNS)[number]

type Area = { code: string; name: string }

export type DepartmentRow = {
  /** `null` only for the jobs placed in no area. */
  code: string | null
  name: string
  /** The area a unit or pay department sits in; `null` for an area's own row. */
  area: Area | null
  /** Total Expenditure Budget; `null` when the budget publishes no org with this code. */
  budgetCents: number | null
  jobs: number
  spendCents: number | null
  medianRateCents: number | null
  /** Each figure's change from the year before, as a fraction; `null` where the method leaves it blank. */
  changes: Record<FigureColumn, number | null>
}

/** A census change is blank when the earlier census has fewer jobs. */
export const CHANGE_MIN_JOBS = 10
/** A budget change is blank when the earlier beginning budget is smaller. */
export const CHANGE_MIN_BUDGET_CENTS = 10_000_000

export const DEPARTMENT_TABLE_METHOD = `The budget is UO’s Total Expenditure Budget as published; an area’s is the sum of its units. Its change compares beginning budgets, set at the start of each year, since the total grows through a year and the later year is not at year-end. Jobs are Fall census jobs paid under the code, or, for an area, placed in it; ${SPEND_METHOD} Median salary rate is the median published annual salary rate of primary jobs, temporaries left out. Spend is blank for fewer than ${MIN_JOBS_SHOWN} paid jobs, and median for fewer than ${MIN_JOBS_SHOWN} primary jobs. Each change is the percent change from the year before. It is blank when the earlier year has fewer than ${CHANGE_MIN_JOBS} jobs or a beginning budget under ${formatDollars(CHANGE_MIN_BUDGET_CENTS)}, or does not publish the code. An area’s jobs, spend, and median changes are blank, since the site places fewer of the earlier census’s jobs in areas.`

type BudgetSums = {
  orgs: BudgetYear['orgs']
  totalCents: Map<string, number>
  beginningCents: Map<string, number>
}

function toBudgetSums(budget: BudgetYear): BudgetSums {
  const byOrg = (row: BudgetRow) => row.org
  return {
    orgs: budget.orgs,
    totalCents: sumBy(budget.rows, byOrg),
    beginningCents: sumBy(
      budget.rows,
      byOrg,
      (row) => row.beginningBudgetCents,
    ),
  }
}

/** The amount summed over the units a code covers; `null` when it is no org. */
function unitSum(
  code: string | null,
  orgs: BudgetYear['orgs'],
  amounts: Map<string, number>,
): number | null {
  const units = code === null ? null : unitsOf(code, orgs)
  if (!units) return null
  return [...units].reduce((sum, unit) => sum + (amounts.get(unit) ?? 0), 0)
}

function changeOf(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from <= 0) return null
  return (to - from) / from
}

type RowInput = Pick<DepartmentRow, 'code' | 'name' | 'area'> & {
  records: FallRecord[]
  /** The earlier census's jobs; `null` leaves the census changes blank. */
  earlier: FallRecord[] | null
}

function toRow(
  input: RowInput,
  now: BudgetSums,
  before: BudgetSums,
): DepartmentRow {
  const { code, name, area } = input
  const figures = measureJobs(input.records)
  const earlier = input.earlier === null ? null : measureJobs(input.earlier)
  const hasEarlierJobs = earlier !== null && earlier.jobs >= CHANGE_MIN_JOBS
  const budgetBefore = unitSum(code, before.orgs, before.beginningCents)
  return {
    code,
    name,
    area,
    budgetCents: unitSum(code, now.orgs, now.totalCents),
    jobs: figures.jobs,
    spendCents: figures.spendCents,
    medianRateCents: figures.medianRateCents,
    changes: {
      budget:
        budgetBefore !== null && budgetBefore >= CHANGE_MIN_BUDGET_CENTS
          ? changeOf(budgetBefore, unitSum(code, now.orgs, now.beginningCents))
          : null,
      jobs: hasEarlierJobs ? changeOf(earlier.jobs, figures.jobs) : null,
      spend: hasEarlierJobs
        ? changeOf(earlier.spendCents, figures.spendCents)
        : null,
      median: hasEarlierJobs
        ? changeOf(earlier.medianRateCents, figures.medianRateCents)
        : null,
    },
  }
}

function areaOf(code: string | null, orgs: BudgetYear['orgs']): Area | null {
  return code === null ? null : { code, name: orgs[code]?.name ?? code }
}

/** The units, then the pay departments no unit publishes; a pay department with an area's code is that area's. */
function unitInputs({
  census,
  budget,
}: TableYear): Omit<RowInput, 'earlier'>[] {
  const inputs = new Map<string, Omit<RowInput, 'earlier'>>()
  for (const [code, org] of Object.entries(budget.orgs)) {
    if (org.level === ORG_LEVEL_AREA) continue
    inputs.set(code, {
      code,
      name: org.name,
      area: areaOf(org.parent, budget.orgs),
      records: [],
    })
  }
  for (const record of census.records) {
    const { code, name } = record.payDepartment
    const { area } = census.assign(record)
    if (code === null || code === area) continue
    const input = inputs.get(code) ?? {
      code,
      name,
      area: areaOf(area, budget.orgs),
      records: [],
    }
    input.records.push(record)
    inputs.set(code, input)
  }
  return [...inputs.values()]
}

/** Each area with the jobs placed in it, then the jobs placed in none. */
function areaInputs({ census, budget }: TableYear): RowInput[] {
  const placed = new Map<string | null, FallRecord[]>()
  for (const record of census.records) {
    const { area } = census.assign(record)
    const records = placed.get(area) ?? []
    records.push(record)
    placed.set(area, records)
  }
  const unplaced = placed.get(null)
  return [
    ...listAreas(budget.orgs).map(({ code, name }) => ({
      code,
      name,
      area: null,
      records: placed.get(code) ?? [],
      earlier: null,
    })),
    ...(unplaced
      ? [
          {
            code: null,
            name: UNASSIGNED_AREA,
            area: null,
            records: unplaced,
            earlier: null,
          },
        ]
      : []),
  ]
}

/** The rows of both levels for one census, with changes from the one before. */
export function departmentRows(
  now: TableYear,
  before: TableYear,
): { areas: DepartmentRow[]; units: DepartmentRow[] } {
  const nowSums = toBudgetSums(now.budget)
  const beforeSums = toBudgetSums(before.budget)
  const earlierByCode = new Map<string | null, FallRecord[]>()
  for (const record of before.census.records) {
    const { code } = record.payDepartment
    const records = earlierByCode.get(code) ?? []
    records.push(record)
    earlierByCode.set(code, records)
  }
  return {
    areas: areaInputs(now).map((input) => toRow(input, nowSums, beforeSums)),
    units: unitInputs(now).map((input) =>
      toRow(
        { ...input, earlier: earlierByCode.get(input.code) ?? [] },
        nowSums,
        beforeSums,
      ),
    ),
  }
}

/** The latest two censuses with the budget years that name their areas; `null` with fewer than two. */
export function latestTableYears(
  censuses: DepartmentCensus[],
  budgets: BudgetYear[],
): { now: TableYear; before: TableYear } | null {
  const tableYear = (census: DepartmentCensus): TableYear => {
    const budget = budgets.find(
      ({ fiscalYear }) => fiscalYear === census.fiscalYear,
    )
    if (!budget) {
      throw new Error(
        `The budget for fiscal year ${census.fiscalYear} is not loaded`,
      )
    }
    return { census, budget }
  }
  const [now, before] = [...censuses].sort((a, b) => b.year - a.year)
  return now && before
    ? { now: tableYear(now), before: tableYear(before) }
    : null
}

/** The latest census and the one before it, each with the budget year that names its areas. */
export function selectTableSources(manifest: Manifest): {
  now: { year: number; fiscalYear: number }
  before: { year: number; fiscalYear: number }
} {
  const [now, before] = [...manifest.fall]
    .sort((a, b) => b.year - a.year)
    .map(({ year, censusDate }) => ({
      year,
      fiscalYear: fiscalYearForCensus(manifest, censusDate),
    }))
  if (!now || !before) {
    throw new Error('The department table needs two Fall censuses')
  }
  return { now, before }
}

export const DEPARTMENT_SORTS = [
  'name',
  'area',
  'budget',
  'budgetChange',
  'jobs',
  'jobsChange',
  'spend',
  'spendChange',
  'median',
  'medianChange',
] as const
export type DepartmentSort = (typeof DEPARTMENT_SORTS)[number]

const SORT_VALUES: Record<
  DepartmentSort,
  (row: DepartmentRow) => string | number | null
> = {
  name: (row) => row.name,
  area: (row) => row.area?.name ?? null,
  budget: (row) => row.budgetCents,
  budgetChange: (row) => row.changes.budget,
  jobs: (row) => row.jobs,
  jobsChange: (row) => row.changes.jobs,
  spend: (row) => row.spendCents,
  spendChange: (row) => row.changes.spend,
  median: (row) => row.medianRateCents,
  medianChange: (row) => row.changes.median,
}

function compareValues(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b))
}

/** The rows in the sort's order, blanks last either way, ties by name. */
export function sortRows(
  rows: DepartmentRow[],
  sort: DepartmentSort,
  dir: SortDirection,
): DepartmentRow[] {
  const pick = SORT_VALUES[sort]
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = pick(a)
    const y = pick(b)
    const order =
      x === null || y === null
        ? Number(x === null) - Number(y === null)
        : sign * compareValues(x, y)
    return order || a.name.localeCompare(b.name)
  })
}

/** The rows in the area, when given, whose name or code contains the text. */
export function filterRows(
  rows: DepartmentRow[],
  { q, area }: { q: string; area: string | null },
): DepartmentRow[] {
  const needle = q.trim().toLowerCase()
  return rows.filter(
    (row) =>
      (area === null || row.area?.code === area) &&
      (row.name.toLowerCase().includes(needle) ||
        (row.code ?? '').toLowerCase().includes(needle)),
  )
}
