import {
  censusYearOf,
  type FallRecord,
  type FallYear,
  isPrimaryJob,
} from '../data/fall.ts'

/**
 * A computed link between a name's records in `fromYear` and `fromYear + 1`:
 * the name is identical and each year's one primary job, `from` and `to`,
 * shares its pay department. UO publishes no person identifier; this is not a
 * source figure.
 */
export type PersonLink = {
  name: string
  fromYear: number
  from: FallRecord
  to: FallRecord
}

/** Each name's one primary job, or `null` for a name with more than one. */
function primaryJobs(records: FallRecord[]): Map<string, FallRecord | null> {
  const jobs = new Map<string, FallRecord | null>()
  for (const record of records) {
    if (!isPrimaryJob(record)) continue
    jobs.set(record.name, jobs.has(record.name) ? null : record)
  }
  return jobs
}

export function findPersonLinks(years: FallYear[]): PersonLink[] {
  const jobsByYear = new Map(
    years.map((year) => [
      censusYearOf(year.censusDate),
      primaryJobs(year.records),
    ]),
  )
  return [...jobsByYear]
    .sort(([a], [b]) => a - b)
    .flatMap(([fromYear, current]) => {
      const next = jobsByYear.get(fromYear + 1)
      if (!next) return []
      return [...current].flatMap(([name, from]) => {
        const to = next.get(name)
        if (!from || !to) return []
        const { code } = from.payDepartment
        return code !== null && to.payDepartment.code === code
          ? [{ name, fromYear, from, to }]
          : []
      })
    })
}
