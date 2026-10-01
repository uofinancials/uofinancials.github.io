import type { BudgetYear } from '../../data/budget.ts'
import type { DepartmentFile } from '../../data/department.ts'
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

type AreaJobs = { records: FallRecord[]; bases: AreaPlacement['bases'] }

/** One census's jobs by pay code and by the area they are placed in, and how many are placed in none. */
type PlacementIndex = {
  byCode: Map<string | null, FallRecord[]>
  byArea: Map<string, AreaJobs>
  unassigned: number
}

const placementIndexes = new WeakMap<DepartmentCensus, PlacementIndex>()

/** The census's jobs placed once, on first use, so a page for one code never runs the assigner over the census again. */
export function placementIndexOf(census: DepartmentCensus): PlacementIndex {
  const cached = placementIndexes.get(census)
  if (cached) return cached
  const byArea = new Map<string, AreaJobs>()
  let unassigned = 0
  for (const record of census.records) {
    const assignment = census.assign(record)
    if (assignment.basis === 'unassigned') {
      unassigned += 1
      continue
    }
    const placed = byArea.get(assignment.area) ?? {
      records: [],
      bases: { published: 0, name: 0, hand: 0 },
    }
    byArea.set(assignment.area, placed)
    placed.records.push(record)
    placed.bases[assignment.basis] += 1
  }
  const index = {
    byCode: groupBy(census.records, (record) => record.payDepartment.code),
    byArea,
    unassigned,
  }
  placementIndexes.set(census, index)
  return index
}

/** For an area: how its jobs were placed in one census, and the jobs left unplaced site-wide. */
export type AreaPlacement = NonNullable<DepartmentFile['placements']>[number]

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
  const { byArea, unassigned } = placementIndexOf(census)
  const placed = byArea.get(code)
  const placement: AreaPlacement = {
    year: census.year,
    fiscalYear: census.fiscalYear,
    bases: { published: 0, name: 0, hand: 0, ...placed?.bases },
    unassignedSiteWide: unassigned,
  }
  return { year: census.year, records: placed?.records ?? [], placement }
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
          records: placementIndexOf(census).byCode.get(code) ?? [],
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
export type ClassRow = DepartmentFile['classes'][number][StaffKind][number]

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
  year: number,
): Record<StaffKind, ClassRow[]> {
  const records = years.find((census) => census.year === year)?.records ?? []
  return {
    unclassified: kindRows('unclassified', records),
    classified: kindRows('classified', records),
  }
}
