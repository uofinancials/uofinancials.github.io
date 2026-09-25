import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import type { FallEntry, Manifest } from '../data/manifest.ts'
import { type AreaAssignment, createAreaAssigner } from './areas.ts'

/** FTE is held as integer hundredths (the sum of appointment percents). */
export type Totals = {
  people: number
  jobs: number
  fteHundredths: number
  spendCents: number
}

export type GroupTotals = { key: string; totals: Totals }

export type Overview = {
  /** Every job, temporaries included; spend excludes temporaries. */
  total: Totals
  byCategory: GroupTotals[]
  byArea: GroupTotals[]
  /** Classified temporaries, kept out of every spend figure above. */
  temps: Totals
}

const UNPAID_STATUS = /^On Leave (No|Without) Pay|^Terminated$/
const TEMP_POSITION_CLASS = /^TS/
const PERCENT = 100
const NO_CATEGORY = 'No category'
const FISCAL_YEAR_START_MONTH = 7
export const UNASSIGNED_AREA = 'Area not assigned'

/** Fall 2015 publishes no position class for its temporaries, and only for them. */
export function isClassifiedTemp(record: FallRecord): boolean {
  return (
    record.kind === 'classified' &&
    (record.positionClass === null ||
      TEMP_POSITION_CLASS.test(record.positionClass.code))
  )
}

/** Published annual salary rate x FTE, rounded to the cent; zero when unpaid. */
export function jobSpendCents(record: FallRecord): number {
  if (UNPAID_STATUS.test(record.jobStatus)) return 0
  return Math.round(
    (record.annualSalaryRateCents * record.apptPercent) / PERCENT,
  )
}

export function summarize(records: FallRecord[]): Totals {
  return {
    people: new Set(records.map((record) => record.name)).size,
    jobs: records.length,
    fteHundredths: records.reduce((sum, record) => sum + record.apptPercent, 0),
    spendCents: records.reduce((sum, record) => sum + jobSpendCents(record), 0),
  }
}

/** Totals per group, largest spend first. */
export function groupTotals(
  records: FallRecord[],
  keyOf: (record: FallRecord) => string,
): GroupTotals[] {
  const groups = new Map<string, FallRecord[]>()
  for (const record of records) {
    const key = keyOf(record)
    const members = groups.get(key) ?? []
    members.push(record)
    groups.set(key, members)
  }
  return [...groups]
    .map(([key, members]) => ({ key, totals: summarize(members) }))
    .sort(
      (a, b) =>
        b.totals.spendCents - a.totals.spendCents || a.key.localeCompare(b.key),
    )
}

export function buildOverview(
  records: FallRecord[],
  areaOf: (record: FallRecord) => string,
): Overview {
  const temps = records.filter(isClassifiedTemp)
  const others = records.filter((record) => !isClassifiedTemp(record))
  return {
    total: {
      ...summarize(records),
      spendCents: summarize(others).spendCents,
    },
    byCategory: groupTotals(
      others,
      (record) => record.eeoCategory ?? NO_CATEGORY,
    ),
    byArea: groupTotals(others, areaOf),
    temps: summarize(temps),
  }
}

/** UO's fiscal year runs July to June and is named for the year it ends. */
export function fiscalYearOf(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  return month >= FISCAL_YEAR_START_MONTH ? year + 1 : year
}

/**
 * The latest census and the budget year to name its areas with: the fiscal
 * year containing the census, or the latest listed budget before it.
 */
export function selectOverviewSources(manifest: Manifest): {
  census: FallEntry
  fiscalYear: number
} {
  const [census] = [...manifest.fall].sort((a, b) => b.year - a.year)
  if (!census) throw new Error('The manifest lists no Fall census')
  const containing = fiscalYearOf(census.censusDate)
  const [fiscalYear] = manifest.budget
    .map((entry) => entry.fiscalYear)
    .filter((year) => year <= containing)
    .sort((a, b) => b - a)
  if (fiscalYear === undefined) {
    throw new Error(`The manifest lists no budget for Fall ${census.year}`)
  }
  return { census, fiscalYear }
}

export type CensusOverview = Overview & {
  /** Jobs in the area table by how their area was assigned. */
  areaBases: Record<AreaAssignment['basis'], number>
}

/** The overview of one census, with areas named from its fiscal year's budget. */
export function buildCensusOverview(
  census: { year: number; records: FallRecord[] },
  orgs: BudgetYear['orgs'],
): CensusOverview {
  const assign = createAreaAssigner(census.records, orgs, census.year)
  const areaBases = { published: 0, name: 0, hand: 0, unassigned: 0 }
  const areaNames = new Map<FallRecord, string>()
  for (const record of census.records) {
    if (isClassifiedTemp(record)) continue
    const { area, basis } = assign(record)
    areaBases[basis] += 1
    areaNames.set(
      record,
      area === null ? UNASSIGNED_AREA : (orgs[area]?.name ?? area),
    )
  }
  const areaOf = (record: FallRecord) =>
    areaNames.get(record) ?? UNASSIGNED_AREA
  return { ...buildOverview(census.records, areaOf), areaBases }
}
