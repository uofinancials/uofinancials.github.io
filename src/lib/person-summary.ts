import type { FallRecord } from '../data/fall.ts'
import { classOrRankOf, titleOf } from './person-fields.ts'
import type { Person, PersonRun, PersonYear } from './person-lookup.ts'
import { yearsOf } from './person-lookup.ts'

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000
const PERCENT = 100

/** The census a search asks for when the name has it, or else the name's latest. */
export function resolvePersonYear(
  person: Person,
  year: number | undefined,
): number {
  const years = yearsOf(person)
  return year !== undefined && years.includes(year) ? year : Math.max(...years)
}

export function runOf(person: Person, year: number): PersonRun | undefined {
  return person.runs.find((run) =>
    run.years.some((entry) => entry.year === year),
  )
}

function primaryJob({ records }: PersonYear): FallRecord | undefined {
  return records.find((record) => record.jobType === 'Primary')
}

/** A published rate at two censuses; `ratio` is the change as a fraction of the first. */
export type RateChange = {
  fromYear: number
  toYear: number
  fromCents: number
  toCents: number
  ratio: number
}

/** Figures computed from one run's published records, never published by UO. */
export type RunCards = {
  /** Years from the earliest published job start in the run to its last census date. */
  yearsSinceStart: number | null
  /** The primary job's rate at the run's first and last census; `null` for an unlinked run. */
  runChange: RateChange | null
  /** The mean yearly change over pairs whose appointment and term held; `null` when none did. */
  averageChange: { ratio: number; pairsUsed: number; pairs: number } | null
}

function rateChange(from: PersonYear, to: PersonYear): RateChange | null {
  const [fromJob, toJob] = [primaryJob(from), primaryJob(to)]
  if (!fromJob || !toJob) return null
  return {
    fromYear: from.year,
    toYear: to.year,
    fromCents: fromJob.annualSalaryRateCents,
    toCents: toJob.annualSalaryRateCents,
    ratio:
      (toJob.annualSalaryRateCents - fromJob.annualSalaryRateCents) /
      fromJob.annualSalaryRateCents,
  }
}

function isComparable(from: PersonYear, to: PersonYear): boolean {
  const [fromJob, toJob] = [primaryJob(from), primaryJob(to)]
  return (
    fromJob !== undefined &&
    toJob !== undefined &&
    fromJob.apptPercent === toJob.apptPercent &&
    fromJob.termOfServiceMonths === toJob.termOfServiceMonths
  )
}

function yearsSinceStart(run: PersonRun): number | null {
  const starts = run.years.flatMap(({ records }) =>
    records.map((record) => record.jobStartDate),
  )
  const earliest = starts.sort()[0]
  const last = run.years.at(-1)
  if (!earliest || !last) return null
  return (Date.parse(last.censusDate) - Date.parse(earliest)) / MS_PER_YEAR
}

function consecutivePairs(years: PersonYear[]): [PersonYear, PersonYear][] {
  return years.slice(1).flatMap((to, index) => {
    const from = years[index]
    return from ? [[from, to]] : []
  })
}

function averageChange(run: PersonRun): RunCards['averageChange'] {
  const pairs = consecutivePairs(run.years)
  const ratios = pairs
    .filter(([from, to]) => isComparable(from, to))
    .flatMap(([from, to]) => rateChange(from, to)?.ratio ?? [])
  if (ratios.length === 0) return null
  return {
    ratio: ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length,
    pairsUsed: ratios.length,
    pairs: pairs.length,
  }
}

export function runCards(run: PersonRun): RunCards {
  const [first, last] = [run.years[0], run.years.at(-1)]
  return {
    yearsSinceStart: yearsSinceStart(run),
    runChange: run.isLinked && first && last ? rateChange(first, last) : null,
    averageChange: run.isLinked ? averageChange(run) : null,
  }
}

export const TOTAL_SERIES = 'Total, estimated (rate × appointment)'

function jobKeys(records: FallRecord[]): string[] {
  const seen = new Map<string, number>()
  return records.map((record) => {
    const key = `${titleOf(record)} · ${record.payDepartment.name} · ${record.jobType}`
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    return count === 1 ? key : `${key} (${count})`
  })
}

function estimatedTotalCents(records: FallRecord[]): number {
  return Math.round(
    records.reduce(
      (sum, record) =>
        sum + (record.annualSalaryRateCents * record.apptPercent) / PERCENT,
      0,
    ),
  )
}

/** Each job's published rate per census year, `null` where the year has no such job, then the estimated total of rate × appointment. */
export function personRates(person: Person): {
  years: number[]
  series: { key: string; values: (number | null)[] }[]
} {
  const personYears = person.runs.flatMap((run) => run.years)
  const byKey = new Map<string, (number | null)[]>()
  personYears.forEach(({ records }, index) => {
    const keys = jobKeys(records)
    records.forEach((record, position) => {
      const key = keys[position] ?? ''
      const values = byKey.get(key) ?? personYears.map(() => null)
      values[index] = record.annualSalaryRateCents
      byKey.set(key, values)
    })
  })
  return {
    years: personYears.map(({ year }) => year),
    series: [
      ...[...byKey].map(([key, values]) => ({ key, values })),
      {
        key: TOTAL_SERIES,
        values: personYears.map(({ records }) => estimatedTotalCents(records)),
      },
    ],
  }
}

export type HistoryRow = {
  key: string
  year: number
  isLinked: boolean
  title: string
  classOrRank: string | null
  payDepartment: string
  jobType: string
  apptPercent: number
  termOfServiceMonths: number
}

/** Every job under the name, census by census, as published. */
export function jobHistory(person: Person): HistoryRow[] {
  return person.runs.flatMap(({ years, isLinked }) =>
    years.flatMap(({ year, records }) =>
      records.map((record, index) => ({
        key: `${year}-${index}`,
        year,
        isLinked,
        title: titleOf(record),
        classOrRank: classOrRankOf(record),
        payDepartment: record.payDepartment.name,
        jobType: record.jobType,
        apptPercent: record.apptPercent,
        termOfServiceMonths: record.termOfServiceMonths,
      })),
    ),
  )
}
