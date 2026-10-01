import type { BudgetRow, BudgetYear } from '../../data/budget.ts'
import type { FallRecord } from '../../data/fall.ts'
import type { FyTemps } from '../../data/fy-temps.ts'
import type { FallEntry, Manifest } from '../../data/manifest.ts'
import { fiscalYearForCensus, SPEND_METHOD } from '../census/totals.ts'
import { formatDollars } from '../shared/format.ts'
import { changeOf } from '../shared/series.ts'
import { compareKeys, type SortDirection } from '../shared/sort.ts'
import {
  comparablePoints,
  MIN_JOBS_SHOWN,
  measureJobs,
  type TrendPoint,
} from '../trends/trends.ts'
import { sumBy, unitsOf } from './budget.ts'
import { placedAreas, placeUnits } from './codes.ts'
import { type TempsScope, tempsByCensus } from './fy-temps.ts'
import { type DepartmentCensus, placementIndexOf } from './jobs.ts'

/** A census joined to the budget year that names its areas. */
type TableYear = { census: DepartmentCensus; budget: BudgetYear }

type FigureColumn = 'budget' | 'jobs' | 'spend' | 'median'

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
const CHANGE_MIN_JOBS = 10
/** A budget change is blank when the earlier beginning budget is smaller. */
const CHANGE_MIN_BUDGET_CENTS = 10_000_000

export const DEPARTMENT_TABLE_METHOD = `The budget is UO’s Total Expenditure Budget as published; an area’s is the sum of its units. Its change compares beginning budgets, set at the start of each year, since the total grows through a year and the later year is not at year-end. Jobs are Fall census jobs paid under the code or under a code this site joins to it by hand, or, for an area, placed in it; ${SPEND_METHOD} Median salary rate is the median published annual salary rate of primary jobs. Spend is blank for fewer than ${MIN_JOBS_SHOWN} paid jobs, and median for fewer than ${MIN_JOBS_SHOWN} primary jobs. Each change is the percent change from the year before. It is blank when the earlier year has fewer than ${CHANGE_MIN_JOBS} jobs or a beginning budget under ${formatDollars(CHANGE_MIN_BUDGET_CENTS)}, or does not publish the code.`

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

type RowInput = Pick<DepartmentRow, 'code' | 'name' | 'area'> & {
  records: FallRecord[]
  earlier: FallRecord[]
  temps: TempsScope
}

function toRow(
  input: RowInput,
  sums: { now: BudgetSums; before: BudgetSums },
  years: { now: number; before: number; fyTemps: FyTemps },
): DepartmentRow {
  const { code, name, area } = input
  const { now, before } = sums
  const temps = tempsByCensus(years.fyTemps, input.temps)
  const figures = measureJobs(input.records, temps.get(years.now) ?? null)
  const [comparedEarlier, compared] = comparablePoints([
    {
      year: years.before,
      ...measureJobs(input.earlier, temps.get(years.before) ?? null),
    },
    { year: years.now, ...figures },
  ])
  const censusChange = (pick: (point: TrendPoint) => number | null) =>
    comparedEarlier && compared && comparedEarlier.jobs >= CHANGE_MIN_JOBS
      ? changeOf(pick(comparedEarlier), pick(compared))
      : null
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
      jobs: censusChange((point) => point.jobs),
      spend: censusChange((point) => point.spendCents),
      median: censusChange((point) => point.medianRateCents),
    },
  }
}

function areaOf(code: string | null, orgs: BudgetYear['orgs']): Area | null {
  return code === null ? null : { code, name: orgs[code]?.name ?? code }
}

export type AreaFigure = Pick<
  DepartmentRow,
  'code' | 'name' | 'budgetCents' | 'jobs' | 'spendCents'
>

/** Each area's budget and census jobs and spend, as its row in `departmentRows` has them. */
export function areaFigures(
  census: DepartmentCensus,
  budget: BudgetYear,
  fyTemps: FyTemps,
): AreaFigure[] {
  const totals = sumBy(budget.rows, (row) => row.org)
  return placedAreas(census).map(({ code, name, records }) => {
    const { jobs, spendCents } = measureJobs(
      records,
      tempsByCensus(fyTemps, { kind: 'area', code }).get(census.year) ?? null,
    )
    return {
      code,
      name,
      budgetCents: unitSum(code, budget.orgs, totals),
      jobs,
      spendCents,
    }
  })
}

/** The rows of both levels for one census, with changes from the one before. */
export function departmentRows(
  now: TableYear,
  before: TableYear,
  fyTemps: FyTemps,
): { areas: DepartmentRow[]; units: DepartmentRow[] } {
  const sums = {
    now: toBudgetSums(now.budget),
    before: toBudgetSums(before.budget),
  }
  const years = { now: now.census.year, before: before.census.year, fyTemps }
  const row = (input: RowInput) => toRow(input, sums, years)
  const earlier = placementIndexOf(before.census)
  const { orgs } = now.census
  return {
    areas: placedAreas(now.census).map((area) =>
      row({
        ...area,
        area: null,
        earlier:
          area.code === null
            ? earlier.unassigned
            : (earlier.byArea.get(area.code)?.records ?? []),
        temps: { kind: 'area', code: area.code },
      }),
    ),
    units: placeUnits(now.census).map((unit) =>
      row({
        ...unit,
        area: areaOf(unit.area, orgs),
        earlier: earlier.byCode.get(unit.code) ?? [],
        temps: { kind: 'unit', code: unit.code },
      }),
    ),
  }
}

function latestTwo<T extends { year: number }>(
  items: T[],
): { now: T; before: T } | null {
  const [now, before] = [...items].sort((a, b) => b.year - a.year)
  return now && before ? { now, before } : null
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
  const latest = latestTwo(censuses)
  return latest
    ? { now: tableYear(latest.now), before: tableYear(latest.before) }
    : null
}

/** The latest census and the one before it, each with the budget year that names its areas. */
export function selectTableSources(manifest: Manifest): {
  now: { year: number; fiscalYear: number }
  before: { year: number; fiscalYear: number }
} {
  const latest = latestTwo(manifest.fall)
  if (!latest) throw new Error('The department table needs two Fall censuses')
  const source = ({ year, censusDate }: FallEntry) => ({
    year,
    fiscalYear: fiscalYearForCensus(manifest, censusDate),
  })
  return { now: source(latest.now), before: source(latest.before) }
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
        : sign * compareKeys(x, y)
    return order || compareKeys(a.name, b.name)
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
