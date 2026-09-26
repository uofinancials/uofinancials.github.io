import type { FallRecord } from '../data/fall.ts'
import { type PeerMedians, peerMedianFor } from './peer-median.ts'
import { historyValues } from './person-fields.ts'
import {
  type Person,
  type PersonRun,
  type PersonYear,
  personYearsOf,
  primaryJobOf,
} from './person-lookup.ts'
import { positionLabel, positionOf } from './salary-distribution.ts'

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

export function runOf(person: Person, year: number): PersonRun | undefined {
  return person.runs.find((run) =>
    run.years.some((entry) => entry.year === year),
  )
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
  firstYear: number
  lastYear: number
  /** Consecutive census pairs in the run. */
  pairs: number
  /** Years from the earliest published job start in the run to its last census date. */
  yearsSinceStart: number | null
  /** The primary job's rate at the run's first and last census; `null` for an unlinked run. */
  runChange: RateChange | null
  /** The mean yearly change over pairs whose appointment and term held; `null` when none did. */
  averageChange: { ratio: number; pairsUsed: number } | null
}

function ratioOf(from: FallRecord, to: FallRecord): number {
  return (
    (to.annualSalaryRateCents - from.annualSalaryRateCents) /
    from.annualSalaryRateCents
  )
}

function rateChange(from: PersonYear, to: PersonYear): RateChange | null {
  const fromJob = primaryJobOf(from.records)
  const toJob = primaryJobOf(to.records)
  if (!fromJob || !toJob) return null
  return {
    fromYear: from.year,
    toYear: to.year,
    fromCents: fromJob.annualSalaryRateCents,
    toCents: toJob.annualSalaryRateCents,
    ratio: ratioOf(fromJob, toJob),
  }
}

/** The pair's rate change, or none when the primary job's appointment or term changed. */
function comparableRatio(from: PersonYear, to: PersonYear): number[] {
  const fromJob = primaryJobOf(from.records)
  const toJob = primaryJobOf(to.records)
  if (
    !fromJob ||
    !toJob ||
    fromJob.apptPercent !== toJob.apptPercent ||
    fromJob.termOfServiceMonths !== toJob.termOfServiceMonths
  ) {
    return []
  }
  return [ratioOf(fromJob, toJob)]
}

function yearsSinceStart(run: PersonRun): number | null {
  const earliest = run.years
    .flatMap(({ records }) => records.map((record) => record.jobStartDate))
    .sort()[0]
  const last = run.years.at(-1)
  if (!earliest || !last) return null
  return (Date.parse(last.censusDate) - Date.parse(earliest)) / MS_PER_YEAR
}

function averageChange(years: PersonYear[]): RunCards['averageChange'] {
  const ratios = years.slice(1).flatMap((to, index) => {
    const from = years[index]
    return from ? comparableRatio(from, to) : []
  })
  if (ratios.length === 0) return null
  return {
    ratio: ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length,
    pairsUsed: ratios.length,
  }
}

export function runCards(run: PersonRun): RunCards {
  const first = run.years[0]
  const last = run.years.at(-1)
  return {
    firstYear: first?.year ?? 0,
    lastYear: last?.year ?? 0,
    pairs: run.years.length - 1,
    yearsSinceStart: yearsSinceStart(run),
    runChange: run.isLinked && first && last ? rateChange(first, last) : null,
    averageChange: run.isLinked ? averageChange(run.years) : null,
  }
}

export const MEDIAN_SERIES = 'Median rate, primary job’s class or rank'

/** Each job type and pay department's published rate per census year, `null` where the year has none, then the median of the primary job's class or rank and the groups that median came from. */
export function personRates(
  person: Person,
  medians: PeerMedians,
): {
  years: number[]
  series: { key: string; values: (number | null)[] }[]
  medianGroups: string[]
} {
  const personYears = personYearsOf(person)
  const byKey = new Map<string, (number | null)[]>()
  personYears.forEach(({ records }, index) => {
    const seen = new Map<string, number>()
    for (const record of records) {
      const job = `${record.jobType} · ${record.payDepartment.name}`
      const count = (seen.get(job) ?? 0) + 1
      seen.set(job, count)
      const key = count === 1 ? job : `${job} (${count})`
      const values = byKey.get(key) ?? personYears.map(() => null)
      values[index] = record.annualSalaryRateCents
      byKey.set(key, values)
    }
  })
  const peers = personYears.map(({ year, records }) => {
    const primary = primaryJobOf(records)
    return primary ? peerMedianFor(medians, year, primary) : null
  })
  const medianGroups = [
    ...new Set(peers.flatMap((peer) => (peer ? [peer.group.label] : []))),
  ]
  const jobSeries = [...byKey].map(([key, values]) => ({ key, values }))
  return {
    years: personYears.map(({ year }) => year),
    series:
      medianGroups.length === 0
        ? jobSeries
        : [
            ...jobSeries,
            {
              key: MEDIAN_SERIES,
              values: peers.map((peer) => peer?.medianCents ?? null),
            },
          ],
    medianGroups,
  }
}

/** Every job under the name, census by census, with its history fields as published. */
export function jobHistory(
  person: Person,
): { key: string; year: number; isLinked: boolean; values: string[] }[] {
  return person.runs.flatMap(({ years, isLinked }) =>
    years.flatMap(({ year, records }) =>
      records.map((record, index) => ({
        key: `${year}-${index}`,
        year,
        isLinked,
        values: historyValues(record),
      })),
    ),
  )
}

/** The distinct pay departments with a code among one census's jobs, by code. */
export function payDepartmentsOf(records: FallRecord[]): Map<string, string> {
  return new Map(
    records.flatMap(({ payDepartment: { code, name } }) =>
      code === null ? [] : [[code, name] as const],
    ),
  )
}

/** The distinct position classes and ranks among one census's jobs, with how each reads. */
export function positionsOf(
  records: FallRecord[],
): { position: string; label: string }[] {
  const positions = new Set(
    records.flatMap((record) => positionOf(record) ?? []),
  )
  return [...positions].map((position) => ({
    position,
    label: positionLabel(records, position),
  }))
}
