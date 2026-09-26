import type { FallRecord } from '../data/fall.ts'
import type { FallEntry, Manifest } from '../data/manifest.ts'

/** FTE is held as integer hundredths (the sum of appointment percents). */
export type Totals = {
  people: number
  jobs: number
  fteHundredths: number
  spendCents: number
}

export type GroupTotals = { key: string; totals: Totals }

/** A census's spend by EEO category, with classified temporaries apart. */
export type CategoryTotals = {
  byCategory: GroupTotals[]
  /** Classified temporaries, kept out of every spend figure above. */
  temps: Totals
  totalSpendCents: number
}

const UNPAID_STATUS = /^On Leave (No|Without) Pay|^Terminated$/
const TEMP_POSITION_CLASS = /^TS/
const PERCENT = 100
export const NO_CATEGORY = 'No category'
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

/** How `jobSpendCents` and the spend totals are computed, as stated on the page. */
export const SPEND_METHOD =
  'salary spend is the published annual salary rate x FTE, summed over jobs; jobs on unpaid leave count as zero and classified temporaries are left out. It estimates annual pay; it is not payroll.'

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

export function categoryTotals(records: FallRecord[]): CategoryTotals {
  const others = records.filter((record) => !isClassifiedTemp(record))
  return {
    byCategory: groupTotals(
      others,
      (record) => record.eeoCategory ?? NO_CATEGORY,
    ),
    temps: summarize(records.filter(isClassifiedTemp)),
    totalSpendCents: summarize(others).spendCents,
  }
}

/** UO's fiscal year runs July to June and is named for the year it ends. */
export function fiscalYearOf(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  return month >= FISCAL_YEAR_START_MONTH ? year + 1 : year
}

/**
 * The budget year to name a census's areas with: the fiscal year containing
 * it, or the latest listed before it, or else the earliest listed.
 */
export function fiscalYearForCensus(
  manifest: Manifest,
  censusDate: string,
): number {
  const containing = fiscalYearOf(censusDate)
  const listed = manifest.budget
    .map((entry) => entry.fiscalYear)
    .sort((a, b) => a - b)
  const fiscalYear =
    listed.filter((year) => year <= containing).at(-1) ?? listed[0]
  if (fiscalYear === undefined) {
    throw new Error(
      `The manifest lists no budget for the census of ${censusDate}`,
    )
  }
  return fiscalYear
}

/** The latest census and the budget year to name its areas with. */
export function selectOverviewSources(manifest: Manifest): {
  census: FallEntry
  fiscalYear: number
} {
  const [census] = [...manifest.fall].sort((a, b) => b.year - a.year)
  if (!census) throw new Error('The manifest lists no Fall census')
  return {
    census,
    fiscalYear: fiscalYearForCensus(manifest, census.censusDate),
  }
}
