import {
  censusYearOf,
  type FallRecord,
  type FallYear,
  isPrimaryJob,
} from '../../data/fall.ts'
import {
  type PersonNames,
  personNameOf,
  personNamesOf,
} from './person-names.ts'

/**
 * A computed link between a person's records in `fromYear` and `fromYear + 1`:
 * the name is identical, or joined by `personNamesOf`, and each year's one
 * primary job, `from` and `to`, shares its pay department. `name` is the
 * person's latest name. UO publishes no person identifier; this is not a source
 * figure.
 */
export type PersonLink = {
  name: string
  fromYear: number
  from: FallRecord
  to: FallRecord
}

/** Each person's one primary job, or `null` for a person with more than one. */
function primaryJobs(
  records: FallRecord[],
  names: PersonNames,
): Map<string, FallRecord | null> {
  const jobs = new Map<string, FallRecord | null>()
  for (const record of records) {
    if (!isPrimaryJob(record)) continue
    const name = personNameOf(names, record.name)
    jobs.set(name, jobs.has(name) ? null : record)
  }
  return jobs
}

export function findPersonLinks(years: FallYear[]): PersonLink[] {
  const names = personNamesOf(years)
  const jobsByYear = new Map(
    years.map((year) => [
      censusYearOf(year.censusDate),
      primaryJobs(year.records, names),
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
