import { censusYearOf, type FallRecord, type FallYear } from '../data/fall.ts'
import { findPersonLinks } from './person-links.ts'

export const MIN_QUERY_CHARS = 2
export const MAX_MATCHES = 50

/** Consecutive census years of one name; `isLinked` when a computed person link joins each pair. */
export type PersonRun = { years: number[]; isLinked: boolean }

export type Person = {
  name: string
  searchKey: string
  years: { year: number; records: FallRecord[] }[]
  runs: PersonRun[]
  latestPayDepartment: string
}

function normalize(text: string): string {
  return text.toLowerCase().replaceAll(',', ' ').replace(/\s+/g, ' ').trim()
}

function chainYears(
  years: number[],
  joinsPrevious: (year: number, previous: number) => boolean,
): number[][] {
  const chains: number[][] = []
  for (const year of years) {
    const last = chains.at(-1)
    const previous = last?.at(-1)
    if (last && previous !== undefined && joinsPrevious(year, previous)) {
      last.push(year)
    } else chains.push([year])
  }
  return chains
}

function toRuns(years: number[], linkedFrom: Set<number>): PersonRun[] {
  return chainYears(years, (year) => linkedFrom.has(year - 1)).map((run) => ({
    years: run,
    isLinked: run.length > 1,
  }))
}

function linkedYearsByName(years: FallYear[]): Map<string, Set<number>> {
  const linked = new Map<string, Set<number>>()
  for (const { name, fromYear } of findPersonLinks(years)) {
    const fromYears = linked.get(name) ?? new Set()
    linked.set(name, fromYears.add(fromYear))
  }
  return linked
}

/** One entry per name exactly as published, sorted by name. */
export function indexPeople(years: FallYear[]): Person[] {
  const byName = new Map<string, Map<number, FallRecord[]>>()
  const ordered = [...years].sort((a, b) =>
    a.censusDate.localeCompare(b.censusDate),
  )
  for (const { censusDate, records } of ordered) {
    const year = censusYearOf(censusDate)
    for (const record of records) {
      const recordsByYear = byName.get(record.name) ?? new Map()
      recordsByYear.set(year, [...(recordsByYear.get(year) ?? []), record])
      byName.set(record.name, recordsByYear)
    }
  }
  const linked = linkedYearsByName(years)
  return [...byName]
    .map(([name, recordsByYear]) => {
      const personYears = [...recordsByYear].map(([year, records]) => ({
        year,
        records,
      }))
      const latest = personYears.at(-1)?.records[0]
      return {
        name,
        searchKey: normalize(name),
        years: personYears,
        runs: toRuns([...recordsByYear.keys()], linked.get(name) ?? new Set()),
        latestPayDepartment: latest?.payDepartment.name ?? '',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
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
  return chainYears(years, (year, previous) => previous === year - 1)
    .map(([first, ...rest]) =>
      rest.length === 0 ? String(first) : `${first}-${rest.at(-1)}`,
    )
    .join(', ')
}
