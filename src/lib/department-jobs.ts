import type { BudgetYear } from '../data/budget.ts'
import {
  censusYearOf,
  type FallRecord,
  type FallYear,
  type StaffKind,
} from '../data/fall.ts'
import type { Manifest } from '../data/manifest.ts'
import {
  type AreaAssignment,
  createAreaAssigner,
  ORG_LEVEL_AREA,
} from './areas.ts'
import { fiscalYearForCensus } from './overview.ts'
import {
  buildTrends,
  measureJobs,
  type TrendPoint,
  type Trends,
} from './trends.ts'

/** Rows and points with fewer jobs show no spend or median, so none gives one job's pay. */
export const MIN_JOBS_SHOWN = 3

/** One census with the budget hierarchy that names its areas, and the area assigner built from them. */
export type DepartmentCensus = {
  year: number
  records: FallRecord[]
  fiscalYear: number
  orgs: BudgetYear['orgs']
  assign: (record: FallRecord) => AreaAssignment
}

export function toDepartmentCensus(
  { year, records }: { year: number; records: FallRecord[] },
  budget: BudgetYear,
): DepartmentCensus {
  return {
    year,
    records,
    fiscalYear: budget.fiscalYear,
    orgs: budget.orgs,
    assign: createAreaAssigner(records, budget.orgs, year),
  }
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
  }
}

function withhold<T extends Omit<TrendPoint, 'year'>>(figures: T): T {
  if (figures.jobs >= MIN_JOBS_SHOWN) return figures
  return { ...figures, spendCents: null, medianRateCents: null }
}

/** The department's jobs over its censuses with jobs, spend and median withheld under `MIN_JOBS_SHOWN` jobs. */
export function departmentTrends(
  { years, yearsWithJobs }: DepartmentYears,
  kind: StaffKind | 'all',
): Trends {
  const trends = buildTrends(years, {
    kind,
    group: null,
    from: yearsWithJobs[0] ?? 0,
    to: yearsWithJobs.at(-1) ?? 0,
  })
  return {
    series: trends.series.map(({ key, points }) => ({
      key,
      points: points.map(withhold),
    })),
    total: trends.total.map(withhold),
  }
}

/** A position class or rank row; spend and median are `null` when withheld or not applicable. */
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
  return { label, ...withhold(measureJobs(records)) }
}

function kindRows(kind: StaffKind, records: FallRecord[]): ClassRow[] {
  const byLabel = new Map<string, FallRecord[]>()
  for (const record of records) {
    if (record.kind !== kind) continue
    const label = classLabelOf(record)
    const members = byLabel.get(label) ?? []
    members.push(record)
    byLabel.set(label, members)
  }
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
