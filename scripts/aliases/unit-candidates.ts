import type { BudgetYear } from '../../src/data/budget.ts'
import type { FallYear } from '../../src/data/fall.ts'

export type UnitCandidateReason = 'same-name' | 'name-prefix' | 'jobs-moved'

/** Two department codes that may name one unit, in code order. */
export type UnitCandidate = {
  codes: readonly [string, string]
  reason: UnitCandidateReason
}

/** Fewest continuing jobs whose move from one code to another marks the codes as candidates. */
export const MIN_MOVED_JOBS = 3

/** Fewest words a normalised name needs before another code's name that starts with it marks the codes as candidates. */
export const MIN_PREFIX_WORDS = 3

const ABBREVIATIONS: readonly [RegExp, string][] = [
  [/&/g, ' and '],
  [/\blang\b/g, 'language'],
  [/\b(ctr|cntr)\b/g, 'center'],
  [/\bmgmt\b/g, 'management'],
  [/\bdept\b/g, 'department'],
  [/\b(ops|oper)\b/g, 'operations'],
]

export function normalizeUnitName(name: string): string {
  const expanded = ABBREVIATIONS.reduce(
    (text, [pattern, word]) => text.replace(pattern, word),
    name.toLowerCase(),
  )
  return expanded
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function codesByNormalizedName(
  falls: FallYear[],
  budgets: BudgetYear[],
): Map<string, Set<string>> {
  const codesByName = new Map<string, Set<string>>()
  const add = (name: string, code: string) => {
    const key = normalizeUnitName(name)
    codesByName.set(key, (codesByName.get(key) ?? new Set()).add(code))
  }
  for (const { records } of falls) {
    for (const { payDepartment, homeDepartment } of records) {
      for (const { code, name } of [payDepartment, homeDepartment]) {
        if (code !== null) add(name, code)
      }
    }
  }
  for (const { orgs } of budgets) {
    for (const [code, { name }] of Object.entries(orgs)) add(name, code)
  }
  return codesByName
}

function crossPairs(left: Set<string>, right: Set<string>): string[] {
  return [...left].flatMap((a) =>
    [...right].filter((b) => b !== a).map((b) => pairKey(a, b)),
  )
}

function sameNamePairs(codesByName: Map<string, Set<string>>): string[] {
  return [...codesByName.values()].flatMap((codes) => crossPairs(codes, codes))
}

/** Code pairs where one code's normalised name, of at least `MIN_PREFIX_WORDS` words, begins the other's. */
function namePrefixPairs(codesByName: Map<string, Set<string>>): string[] {
  const names = [...codesByName.keys()]
  return names
    .filter((name) => name.split(' ').length >= MIN_PREFIX_WORDS)
    .flatMap((prefix) =>
      names
        .filter((name) => name.startsWith(`${prefix} `))
        .flatMap((name) =>
          crossPairs(
            codesByName.get(prefix) ?? new Set(),
            codesByName.get(name) ?? new Set(),
          ),
        ),
    )
}

function jobIdentity(record: FallYear['records'][number]): string {
  return `${record.name}|${record.jobStartDate}|${record.jobType}`
}

function payCodesByJob(year: FallYear): Map<string, string> {
  const codes = new Map<string, string>()
  for (const record of year.records) {
    const { code } = record.payDepartment
    if (code !== null) codes.set(jobIdentity(record), code)
  }
  return codes
}

/** Code pairs where most of one code's continuing jobs appear under the other in the next census. */
function jobsMovedPairs(falls: FallYear[]): string[] {
  const ordered = [...falls].sort((a, b) =>
    a.censusDate.localeCompare(b.censusDate),
  )
  const years = ordered.map(payCodesByJob)
  return years.slice(1).flatMap((next, i) => {
    const moves = new Map<string, Map<string, number>>()
    for (const [job, from] of years[i] ?? []) {
      const to = next.get(job)
      if (to === undefined) continue
      const targets = moves.get(from) ?? new Map<string, number>()
      targets.set(to, (targets.get(to) ?? 0) + 1)
      moves.set(from, targets)
    }
    return [...moves].flatMap(([from, targets]) => {
      const continuing = [...targets.values()].reduce((a, b) => a + b, 0)
      return [...targets]
        .filter(
          ([to, moved]) =>
            to !== from && moved >= MIN_MOVED_JOBS && moved * 2 >= continuing,
        )
        .map(([to]) => pairKey(from, to))
    })
  })
}

/** Every pair of codes that a shared normalised name, one name beginning another, or a move of most of a code's jobs suggests is one unit. */
export function findUnitCandidates(
  falls: FallYear[],
  budgets: BudgetYear[],
): UnitCandidate[] {
  const codesByName = codesByNormalizedName(falls, budgets)
  const reasons = new Map<string, UnitCandidateReason>()
  const note = (keys: string[], reason: UnitCandidateReason) => {
    for (const key of keys) if (!reasons.has(key)) reasons.set(key, reason)
  }
  note(sameNamePairs(codesByName), 'same-name')
  note(namePrefixPairs(codesByName), 'name-prefix')
  note(jobsMovedPairs(falls), 'jobs-moved')
  return [...reasons]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, reason]) => {
      const [a = '', b = ''] = key.split('|')
      return { codes: [a, b], reason }
    })
}
