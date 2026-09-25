import { censusYearOf, type FallRecord, type FallYear } from '../data/fall.ts'

/**
 * A computed link between a name's records in `fromYear` and `fromYear + 1`:
 * the name is identical and each year's one primary job shares this pay
 * department. UO publishes no person identifier; this is not a source figure.
 */
export type PersonLink = {
  name: string
  fromYear: number
  payDepartmentCode: string
}

function primaryPayDepartments(
  records: FallRecord[],
): Map<string, string | null> {
  const departments = new Map<string, string | null>()
  for (const record of records) {
    if (record.jobType !== 'Primary') continue
    departments.set(
      record.name,
      departments.has(record.name) ? null : record.payDepartment.code,
    )
  }
  return departments
}

export function findPersonLinks(years: FallYear[]): PersonLink[] {
  const departmentsByYear = new Map(
    years.map((year) => [
      censusYearOf(year.censusDate),
      primaryPayDepartments(year.records),
    ]),
  )
  return [...departmentsByYear]
    .sort(([a], [b]) => a - b)
    .flatMap(([fromYear, current]) => {
      const next = departmentsByYear.get(fromYear + 1)
      if (!next) return []
      return [...current].flatMap(([name, code]) =>
        code !== null && next.get(name) === code
          ? [{ name, fromYear, payDepartmentCode: code }]
          : [],
      )
    })
}
