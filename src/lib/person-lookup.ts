import {
  censusYearOf,
  type FallRecord,
  type FallYear,
  isPrimaryJob,
} from '../data/fall.ts'
import { findPersonLinks } from './person-links.ts'

export const MIN_QUERY_CHARS = 2
export const MAX_MATCHES = 50

export type PersonYear = {
  year: number
  censusDate: string
  records: FallRecord[]
}

/** Consecutive census years of one name; `isLinked` when a computed person link joins each pair. */
export type PersonRun = { years: PersonYear[]; isLinked: boolean }

export type Person = {
  name: string
  searchKey: string
  runs: PersonRun[]
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

function recordsByNameAndYear(years: FallYear[]): Map<string, PersonYear[]> {
  const byName = new Map<string, PersonYear[]>()
  const ordered = [...years].sort((a, b) =>
    a.censusDate.localeCompare(b.censusDate),
  )
  for (const { censusDate, records } of ordered) {
    const year = censusYearOf(censusDate)
    for (const record of records) {
      const personYears = byName.get(record.name) ?? []
      byName.set(record.name, personYears)
      const current = personYears.at(-1)
      if (current?.year === year) current.records.push(record)
      else personYears.push({ year, censusDate, records: [record] })
    }
  }
  return byName
}

/** The first job of type Primary among the records, if any. */
export function primaryJobOf(records: FallRecord[]): FallRecord | undefined {
  return records.find(isPrimaryJob)
}

/** One entry per name exactly as published, sorted by name. */
export function indexPeople(years: FallYear[]): Person[] {
  const linked = linkedYearsByName(years)
  return [...recordsByNameAndYear(years)]
    .map(([name, personYears]) => {
      const linkedFrom = linked.get(name) ?? new Set()
      return {
        name,
        searchKey: normalize(name),
        runs: chain(personYears, ({ year }) => linkedFrom.has(year - 1)).map(
          (run) => ({ years: run, isLinked: run.length > 1 }),
        ),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

/** The name's census years in order, each with its records. */
export function personYearsOf(person: Person): PersonYear[] {
  return person.runs.flatMap((run) => run.years)
}

/** Every census year the name appears in, in order. */
export function yearsOf(person: Person): number[] {
  return personYearsOf(person).map(({ year }) => year)
}

/** The query's words, lower-cased with commas dropped; empty for a blank query. */
export function queryWords(query: string): string[] {
  const normalized = normalize(query)
  return normalized === '' ? [] : normalized.split(' ')
}

function hasEveryWordIn(key: string, words: string[]): boolean {
  return words.every((word) => key.includes(word))
}

/** Whether the text holds every word, ignoring case and commas. */
export function hasEveryWord(text: string, words: string[]): boolean {
  return words.length === 0 || hasEveryWordIn(normalize(text), words)
}

/** People whose name holds every word of the query, or `null` for a query too short to search. */
export function matchPeople(
  people: Person[],
  query: string,
): { matches: Person[]; total: number } | null {
  if (normalize(query).length < MIN_QUERY_CHARS) return null
  const words = queryWords(query)
  const found = people.filter(({ searchKey }) =>
    hasEveryWordIn(searchKey, words),
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
