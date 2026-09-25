import { censusYearOf, type FallRecord, type FallYear } from '../data/fall.ts'
import { isClassifiedTemp } from './overview.ts'
import { MIN_JOBS_SHOWN, medianRateCents } from './trends.ts'

const NO_RANK = 'No Rank'
const OA_GRADE = /^(OA\d{2}|EXEC|CCH\d)$/

/** The jobs a person's rate is shown beside: one position class number, one rank, or one OA salary grade. */
export type PeerGroup = { key: string; label: string }

/** A classified job's class number (any letter prefix), an unclassified job's rank, or for no rank its OA salary grade; `null` for temporaries and jobs with none published. */
export function peerGroupOf(record: FallRecord): PeerGroup | null {
  if (record.kind === 'classified') {
    if (!record.positionClass || isClassifiedTemp(record)) return null
    const number = record.positionClass.code.slice(1)
    const title = record.positionClass.title ?? 'Position class'
    return { key: `class ${number}`, label: `${title} (class ${number})` }
  }
  if (record.rank === null) return null
  if (record.rank !== NO_RANK) {
    return { key: `rank ${record.rank}`, label: record.rank }
  }
  const grade = record.oaSalaryGrade
  return grade !== null && OA_GRADE.test(grade)
    ? { key: `grade ${grade}`, label: `OA salary grade ${grade}` }
    : null
}

function medianKey(year: number, group: PeerGroup, term: number): string {
  return `${year}|${group.key}|${term}`
}

/** Median published rate of primary jobs by census, peer group, and term, kept only for at least `MIN_JOBS_SHOWN` jobs. */
export type PeerMedians = Map<string, { medianCents: number; jobs: number }>

export function peerMedians(years: FallYear[]): PeerMedians {
  const rates = new Map<string, number[]>()
  for (const { censusDate, records } of years) {
    const year = censusYearOf(censusDate)
    for (const record of records) {
      const group = peerGroupOf(record)
      if (record.jobType !== 'Primary' || !group) continue
      const key = medianKey(year, group, record.termOfServiceMonths)
      const groupRates = rates.get(key)
      if (groupRates) groupRates.push(record.annualSalaryRateCents)
      else rates.set(key, [record.annualSalaryRateCents])
    }
  }
  const medians: PeerMedians = new Map()
  for (const [key, groupRates] of rates) {
    const medianCents = medianRateCents(groupRates)
    if (groupRates.length >= MIN_JOBS_SHOWN && medianCents !== null) {
      medians.set(key, { medianCents, jobs: groupRates.length })
    }
  }
  return medians
}

/** The median for a job's peer group and term in a census, if one is shown. */
export function peerMedianFor(
  medians: PeerMedians,
  year: number,
  record: FallRecord,
): { group: PeerGroup; medianCents: number; jobs: number } | null {
  const group = peerGroupOf(record)
  if (!group) return null
  const median = medians.get(medianKey(year, group, record.termOfServiceMonths))
  return median ? { group, ...median } : null
}
