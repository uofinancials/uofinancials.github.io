import { censusYearOf, type FallYear } from '../../data/fall.ts'
import { DISTINCT_PEOPLE, PERSON_ALIASES } from '../../data/person-aliases.ts'
import { findNamePairs, isLinkedByRule, namePairKey } from './name-pairs.ts'

/** Each published name joined to another as one person, mapped to that person's latest published name. */
export type PersonNames = Map<string, string>

const namesByYears = new WeakMap<FallYear[], PersonNames>()

function lastYearByName(years: FallYear[]): Map<string, number> {
  const lastYears = new Map<string, number>()
  for (const { censusDate, records } of years) {
    const year = censusYearOf(censusDate)
    for (const { name } of records) {
      lastYears.set(name, Math.max(year, lastYears.get(name) ?? year))
    }
  }
  return lastYears
}

/** The name pairs joined as one person: every hand-reviewed pair, and every pair a rule links that no review rejected. */
function joinedPairs(years: FallYear[]): (readonly [string, string])[] {
  const rejected = new Set(DISTINCT_PEOPLE.map(namePairKey))
  const byRule = findNamePairs(years)
    .filter(
      (pair) => isLinkedByRule(pair) && !rejected.has(namePairKey(pair.names)),
    )
    .map(({ names }) => names)
  return [...PERSON_ALIASES, ...byRule]
}

function groupNames(pairs: (readonly [string, string])[]): string[][] {
  const groupOf = new Map<string, Set<string>>()
  for (const [earlier, later] of pairs) {
    const first = groupOf.get(earlier) ?? new Set([earlier])
    const second = groupOf.get(later) ?? new Set([later])
    const merged = first === second ? first : new Set([...first, ...second])
    for (const name of merged) groupOf.set(name, merged)
  }
  return [...new Set(groupOf.values())].map((group) => [...group])
}

/** Every published name the census years join to another, by hand review or by a name rule, mapped to the group's latest name. */
export function personNamesOf(years: FallYear[]): PersonNames {
  const cached = namesByYears.get(years)
  if (cached) return cached
  const lastYears = lastYearByName(years)
  const latestFirst = (a: string, b: string) =>
    (lastYears.get(b) ?? 0) - (lastYears.get(a) ?? 0) || a.localeCompare(b)
  const names: PersonNames = new Map()
  for (const group of groupNames(joinedPairs(years))) {
    const [latest = '', ...others] = [...group].sort(latestFirst)
    for (const name of others) names.set(name, latest)
  }
  namesByYears.set(years, names)
  return names
}

/** The name a person is shown under: their latest published name. */
export function personNameOf(names: PersonNames, name: string): string {
  return names.get(name) ?? name
}
