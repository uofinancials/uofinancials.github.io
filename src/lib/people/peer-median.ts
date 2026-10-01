import {
  censusYearOf,
  type FallRecord,
  type FallYear,
  isPrimaryJob,
} from '../../data/fall.ts'
import { groupBy } from '../shared/group.ts'
import { MIN_JOBS_SHOWN, medianRateCents } from '../trends/trends.ts'
import { type PeerGroup, peerGroupOf } from './peer-group.ts'

function medianKey(year: number, group: PeerGroup, term: number): string {
  return `${year}|${group.key}|${term}`
}

/** Median published rate of primary jobs by census, peer group, and term, kept only for at least `MIN_JOBS_SHOWN` jobs. */
export type PeerMedians = Record<string, { medianCents: number; jobs: number }>

export function peerMedians(years: FallYear[]): PeerMedians {
  const medians: PeerMedians = {}
  for (const { censusDate, records } of years) {
    const year = censusYearOf(censusDate)
    const byKey = groupBy(records, (record) => {
      const group = peerGroupOf(record)
      return isPrimaryJob(record) && group
        ? medianKey(year, group, record.termOfServiceMonths)
        : null
    })
    for (const [key, jobs] of byKey) {
      if (key === null) continue
      const groupRates = jobs.map((job) => job.annualSalaryRateCents)
      const medianCents = medianRateCents(groupRates)
      if (groupRates.length >= MIN_JOBS_SHOWN && medianCents !== null) {
        medians[key] = { medianCents, jobs: groupRates.length }
      }
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
  const median = medians[medianKey(year, group, record.termOfServiceMonths)]
  return median ? { group, ...median } : null
}
