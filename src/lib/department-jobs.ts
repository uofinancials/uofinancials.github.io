import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord, StaffKind } from '../data/fall.ts'
import { type AreaAssignment, createAreaAssigner } from './areas.ts'
import { isClassifiedTemp, summarize } from './overview.ts'
import {
  buildTrends,
  medianRateCents,
  type TrendPoint,
  type Trends,
} from './trends.ts'

const ORG_LEVEL_AREA = 3

/** Rows and points with fewer jobs show no spend or median, so none gives one job's pay. */
export const MIN_JOBS_SHOWN = 3

/** One census with the budget hierarchy that names its areas. */
export type DepartmentCensus = {
  year: number
  records: FallRecord[]
  fiscalYear: number
  orgs: BudgetYear['orgs']
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

export function isAreaCode(code: string, censuses: DepartmentCensus[]) {
  return censuses.some(({ orgs }) => orgs[code]?.level === ORG_LEVEL_AREA)
}

function placeInArea(code: string, census: DepartmentCensus) {
  const assign = createAreaAssigner(census.records, census.orgs, census.year)
  const placement: AreaPlacement = {
    year: census.year,
    fiscalYear: census.fiscalYear,
    bases: { published: 0, name: 0, hand: 0 },
    unassignedSiteWide: 0,
  }
  const records = census.records.filter((record) => {
    const assignment = assign(record)
    if (assignment.basis === 'unassigned') {
      placement.unassignedSiteWide += 1
      return false
    }
    if (assignment.area !== code) return false
    placement.bases[assignment.basis] += 1
    return true
  })
  return { records, placement }
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
          records: census.records.filter(
            (record) => record.payDepartment.code === code,
          ),
          placement: null,
        },
  )
  const years = sorted.map(({ year }, index) => ({
    year,
    records: placed[index]?.records ?? [],
  }))
  const placements = placed.flatMap(({ placement }) =>
    placement ? [placement] : [],
  )
  return {
    years,
    yearsWithJobs: years
      .filter(({ records }) => records.length > 0)
      .map(({ year }) => year),
    placements: isArea ? placements : null,
  }
}

/** The department's jobs over its censuses with jobs, small points withheld, and its classes in one census. */
export function departmentJobFigures(
  { years, yearsWithJobs }: DepartmentYears,
  { kind, year }: { kind: StaffKind | 'all'; year: number | null },
): { trends: Trends; classRows: ClassRow[] } {
  const trends = buildTrends(years, {
    kind,
    group: null,
    from: yearsWithJobs[0] ?? 0,
    to: yearsWithJobs.at(-1) ?? 0,
  })
  const records = years.find((census) => census.year === year)?.records ?? []
  return {
    trends: withholdSmallPoints(trends),
    classRows: classTotals(
      records.filter((record) => kind === 'all' || record.kind === kind),
    ),
  }
}

function withholdPoint(point: TrendPoint): TrendPoint {
  if (point.jobs >= MIN_JOBS_SHOWN) return point
  return { ...point, spendCents: null, medianRateCents: null }
}

/** Trends with spend and median withheld wherever a point has fewer than `MIN_JOBS_SHOWN` jobs. */
export function withholdSmallPoints(trends: Trends): Trends {
  return {
    series: trends.series.map(({ key, points }) => ({
      key,
      points: points.map(withholdPoint),
    })),
    total: trends.total.map(withholdPoint),
  }
}

/** A position class or rank row; spend and median are `null` when withheld or not applicable. */
export type ClassRow = {
  kind: StaffKind
  label: string
  jobs: number
  fteHundredths: number
  spendCents: number | null
  medianRateCents: number | null
}

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

function classRow(kind: StaffKind, label: string, records: FallRecord[]) {
  const paid = records.filter((record) => !isClassifiedTemp(record))
  const isShown = records.length >= MIN_JOBS_SHOWN && paid.length > 0
  return {
    kind,
    label,
    jobs: records.length,
    fteHundredths: summarize(records).fteHundredths,
    spendCents: isShown ? summarize(paid).spendCents : null,
    medianRateCents: isShown
      ? medianRateCents(
          paid
            .filter((record) => record.jobType === 'Primary')
            .map((record) => record.annualSalaryRateCents),
        )
      : null,
  }
}

/** Jobs by position class (classified) and rank (unclassified), classes under `MIN_JOBS_SHOWN` jobs folded into one row per kind. */
export function classTotals(records: FallRecord[]): ClassRow[] {
  return (['unclassified', 'classified'] as const).flatMap((kind) => {
    const byLabel = new Map<string, FallRecord[]>()
    for (const record of records) {
      if (record.kind !== kind) continue
      const label = classLabelOf(record)
      byLabel.set(label, [...(byLabel.get(label) ?? []), record])
    }
    const shown: ClassRow[] = []
    const folded: FallRecord[] = []
    for (const [label, members] of byLabel) {
      if (members.length >= MIN_JOBS_SHOWN) {
        shown.push(classRow(kind, label, members))
      } else {
        folded.push(...members)
      }
    }
    shown.sort((a, b) => b.jobs - a.jobs || a.label.localeCompare(b.label))
    return folded.length === 0
      ? shown
      : [...shown, classRow(kind, OTHER_LABEL[kind], folded)]
  })
}
