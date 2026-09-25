import { censusYearOf, type FallRecord, type FallYear } from '../data/fall.ts'
import { type PeerGroup, peerGroupOf } from './peer-group.ts'
import { MIN_JOBS_SHOWN, medianRateCents } from './trends.ts'

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
