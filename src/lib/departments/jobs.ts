import type { BudgetYear } from '../../data/budget.ts'
import {
  censusYearOf,
  type FallRecord,
  type FallYear,
  type StaffKind,
} from '../../data/fall.ts'
import type { FyTemps } from '../../data/fy-temps.ts'
import type { Manifest } from '../../data/manifest.ts'
import {
  type AreaAssignment,
  createAreaAssigner,
  ORG_LEVEL_AREA,
  type PayDepartmentOf,
} from '../census/areas.ts'
import { fiscalYearForCensus } from '../census/totals.ts'
import { groupBy } from '../shared/group.ts'
import {
  buildTrends,
  MIN_JOBS_SHOWN,
  measureJobs,
  type TrendPoint,
  type Trends,
} from '../trends/trends.ts'
import { type TempsScope, tempsByCensus } from './fy-temps.ts'

export const AREA_PLACEMENT_METHOD =
  'An area’s jobs are those whose pay department the site places in it: by UO’s budget hierarchy for the census’s fiscal year, by a department-name prefix every placed department shares, or by hand.'

/** One census with the budget hierarchy that names its areas, and the area assigner built from them. */
export type DepartmentCensus = {
  year: number
  records: FallRecord[]
  fiscalYear: number
  orgs: BudgetYear['orgs']
  assign: (record: PayDepartmentOf) => AreaAssignment
}

const joinedCensuses = new WeakMap<
  FallRecord[],
  WeakMap<BudgetYear, DepartmentCensus>
>()

/** One census joined to a budget year; the same records and budget give back the same join. */
export function toDepartmentCensus(
  { year, records }: { year: number; records: FallRecord[] },
  budget: BudgetYear,
): DepartmentCensus {
  const byBudget = joinedCensuses.get(records) ?? new WeakMap()
  joinedCensuses.set(records, byBudget)
  const cached = byBudget.get(budget)
  if (cached?.year === year) return cached
  const census = {
    year,
    records,
    fiscalYear: budget.fiscalYear,
    orgs: budget.orgs,
    assign: createAreaAssigner(records, budget.orgs, year),
  }
  byBudget.set(budget, census)
  return census
}

/** Each census joined to the budget year that names its areas. */
export function toDepartmentCensuses(
  manifest: Manifest,
  falls: FallYear[],
  budgets: BudgetYear[],
): DepartmentCensus[] {
  return falls.map(({ censusDate, records }) => {
    const fiscalYear = fiscalYearForCensus(manifest, censusDate)
    const budget = budgets.find((listed) => listed.fiscalYear === fiscalYear)
    if (!budget) {
      throw new Error(`The budget for fiscal year ${fiscalYear} is not loaded`)
    }
    return toDepartmentCensus(
      { year: censusYearOf(censusDate), records },
      budget,
    )
  })
}

/** For an area: how its jobs were placed in one census, and the jobs left unplaced site-wide. */
export type AreaPlacement = {
  year: number
  fiscalYear: number
  bases: Record<Exclude<AreaAssignment['basis'], 'unassigned'>, number>
  unassignedSiteWide: number
}

export type DepartmentYears = {
  years: { year: number; records: FallRecord[] }[]
  /** The censuses with at least one job, oldest first. */
  yearsWithJobs: number[]
  /** `null` unless the code is an area. */
  placements: AreaPlacement[] | null
  /** Where the department's classified temporaries' FY pay is summed: its area, or its unit. */
  tempsScope: TempsScope
}

export function isAreaCode(
  code: string,
  hierarchies: { orgs: BudgetYear['orgs'] }[],
): boolean {
  return hierarchies.some(({ orgs }) => orgs[code]?.level === ORG_LEVEL_AREA)
}

function placeInArea(code: string, census: DepartmentCensus) {
  const placement: AreaPlacement = {
    year: census.year,
    fiscalYear: census.fiscalYear,
    bases: { published: 0, name: 0, hand: 0 },
    unassignedSiteWide: 0,
  }
  const records = census.records.filter((record) => {
    const assignment = census.assign(record)
    if (assignment.basis === 'unassigned') {
      placement.unassignedSiteWide += 1
      return false
    }
    if (assignment.area !== code) return false
    placement.bases[assignment.basis] += 1
    return true
  })
  return { year: census.year, records, placement }
}

/** Each census's jobs for a code: the area's placed jobs, or those whose pay department is the code. */
export function departmentYears(
  code: string,
  censuses: DepartmentCensus[],
): DepartmentYears {
  const sorted = [...censuses].sort((a, b) => a.year - b.year)
  const isArea = isAreaCode(code, sorted)
  const placed = sorted.map((census) =>
    isArea
      ? placeInArea(code, census)
      : {
          year: census.year,
          records: census.records.filter(
            (record) => record.payDepartment.code === code,
          ),
          placement: null,
        },
  )
  return {
    years: placed.map(({ year, records }) => ({ year, records })),
    yearsWithJobs: placed
      .filter(({ records }) => records.length > 0)
      .map(({ year }) => year),
    placements: isArea
      ? placed.flatMap(({ placement }) => (placement ? [placement] : []))
      : null,
    tempsScope: isArea ? { kind: 'area', code } : { kind: 'unit', code },
  }
}

/** The department's jobs over its censuses with jobs. */
export function departmentTrends(
  { years, yearsWithJobs, tempsScope }: DepartmentYears,
  kind: StaffKind | 'all',
  fyTemps: FyTemps,
): Trends {
  return buildTrends(
    years,
    {
      kind,
      group: null,
      dept: null,
      position: null,
      jobs: null,
      from: yearsWithJobs[0] ?? 0,
      to: yearsWithJobs.at(-1) ?? 0,
    },
    tempsByCensus(fyTemps, tempsScope),
  )
}

/** A position class or rank row; spend and median as `measureJobs` gives them. */
export type ClassRow = { label: string } & Omit<TrendPoint, 'year'>

const OTHER_LABEL: Record<StaffKind, string> = {
  classified: `Other position classes (fewer than ${MIN_JOBS_SHOWN} jobs each)`,
  unclassified: `Other ranks (fewer than ${MIN_JOBS_SHOWN} jobs each)`,
}

function classLabelOf(record: FallRecord): string {
  if (record.kind === 'unclassified') return record.rank ?? 'Rank not published'
  if (!record.positionClass) return 'Position class not published'
  const { code, title } = record.positionClass
  return title ? `${code} ${title}` : code
}

function classRow(label: string, records: FallRecord[]): ClassRow {
  return { label, ...measureJobs(records) }
}

function kindRows(kind: StaffKind, records: FallRecord[]): ClassRow[] {
  const byLabel = groupBy(
    records.filter((record) => record.kind === kind),
    classLabelOf,
  )
  const shown: ClassRow[] = []
  const folded: FallRecord[] = []
  for (const [label, members] of byLabel) {
    if (members.length >= MIN_JOBS_SHOWN) shown.push(classRow(label, members))
    else folded.push(...members)
  }
  shown.sort((a, b) => b.jobs - a.jobs || a.label.localeCompare(b.label))
  return folded.length === 0
    ? shown
    : [...shown, classRow(OTHER_LABEL[kind], folded)]
}

/**
 * One census's jobs by rank (unclassified) and position class (classified),
 * classes under `MIN_JOBS_SHOWN` jobs folded into one row per kind.
 */
export function departmentClasses(
  { years }: DepartmentYears,
  { kind, year }: { kind: StaffKind | 'all'; year: number | null },
): Record<StaffKind, ClassRow[]> {
  const records = years.find((census) => census.year === year)?.records ?? []
  const rowsOf = (of: StaffKind) =>
    kind === 'all' || kind === of ? kindRows(of, records) : []
  return {
    unclassified: rowsOf('unclassified'),
    classified: rowsOf('classified'),
  }
}
