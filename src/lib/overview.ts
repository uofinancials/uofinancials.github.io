import type { FallRecord } from '../data/fall.ts'

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

export function isClassifiedTemp(record: FallRecord): boolean {
  return (
    record.kind === 'classified' &&
    TEMP_POSITION_CLASS.test(record.positionClass?.code ?? '')
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
    groups.set(key, [...(groups.get(key) ?? []), record])
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
