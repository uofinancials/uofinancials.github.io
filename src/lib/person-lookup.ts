import { censusYearOf, type FallRecord, type FallYear } from '../data/fall.ts'
import { findPersonLinks } from './person-links.ts'

export const MIN_QUERY_CHARS = 2
export const MAX_MATCHES = 50

export type PersonYear = { year: number; records: FallRecord[] }

/** Consecutive census years of one name; `isLinked` when a computed person link joins each pair. */
export type PersonRun = { years: PersonYear[]; isLinked: boolean }

export type Person = {
  name: string
  searchKey: string
  runs: PersonRun[]
  latestPayDepartment: string
}

function normalize(text: string): string {
  return text.toLowerCase().replaceAll(',', ' ').replace(/\s+/g, ' ').trim()
}

function chain<T>(
  items: T[],
  joinsPrevious: (item: T, previous: T) => boolean,
): T[][] {
  const chains: T[][] = []
  for (const item of items) {
    const last = chains.at(-1)
    const previous = last?.at(-1)
    if (last && previous !== undefined && joinsPrevious(item, previous)) {
      last.push(item)
    } else chains.push([item])
  }
  return chains
}

function linkedYearsByName(years: FallYear[]): Map<string, Set<number>> {
  const linked = new Map<string, Set<number>>()
  for (const { name, fromYear } of findPersonLinks(years)) {
    const fromYears = linked.get(name) ?? new Set()
    linked.set(name, fromYears.add(fromYear))
  }
  return linked
}

function recordsByNameAndYear(
  years: FallYear[],
): Map<string, Map<number, FallRecord[]>> {
  const byName = new Map<string, Map<number, FallRecord[]>>()
  const ordered = [...years].sort((a, b) =>
    a.censusDate.localeCompare(b.censusDate),
  )
  for (const { censusDate, records } of ordered) {
    const year = censusYearOf(censusDate)
    for (const record of records) {
      const byYear = byName.get(record.name) ?? new Map<number, FallRecord[]>()
      byName.set(record.name, byYear)
      const yearRecords = byYear.get(year)
      if (yearRecords) yearRecords.push(record)
      else byYear.set(year, [record])
    }
  }
  return byName
}

/** One entry per name exactly as published, sorted by name. */
export function indexPeople(years: FallYear[]): Person[] {
  const linked = linkedYearsByName(years)
  return [...recordsByNameAndYear(years)]
    .map(([name, byYear]) => {
      const personYears = [...byYear].map(([year, records]) => ({
        year,
        records,
      }))
      const linkedFrom = linked.get(name) ?? new Set()
      return {
        name,
        searchKey: normalize(name),
        runs: chain(personYears, ({ year }) => linkedFrom.has(year - 1)).map(
          (run) => ({ years: run, isLinked: run.length > 1 }),
        ),
        latestPayDepartment:
          personYears.at(-1)?.records[0]?.payDepartment.name ?? '',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

/** Every census year the name appears in, in order. */
export function yearsOf(person: Person): number[] {
  return person.runs.flatMap((run) => run.years.map(({ year }) => year))
}

/** People whose name holds every word of the query, or `null` for a query too short to search. */
export function matchPeople(
  people: Person[],
  query: string,
): { matches: Person[]; total: number } | null {
  const normalized = normalize(query)
  if (normalized.length < MIN_QUERY_CHARS) return null
  const words = normalized.split(' ')
  const found = people.filter(({ searchKey }) =>
    words.every((word) => searchKey.includes(word)),
  )
  return { matches: found.slice(0, MAX_MATCHES), total: found.length }
}

/** Sorted years as ranges, e.g. `2014, 2016-2018`. */
export function formatYearRanges(years: number[]): string {
  return chain(years, (year, previous) => previous === year - 1)
    .map(([first, ...rest]) =>
      rest.length === 0 ? String(first) : `${first}-${rest.at(-1)}`,
    )
    .join(', ')
}
