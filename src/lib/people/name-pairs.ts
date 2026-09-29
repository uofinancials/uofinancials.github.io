import type { FallRecord, FallYear } from '../../data/fall.ts'

export type NamePairReason = 'same-job' | 'spelling'

/** Two published names that may be one person, the earlier first, and the pay department they share. */
export type NamePair = {
  names: readonly [string, string]
  code: string
  reason: NamePairReason
}

function titleOf(record: FallRecord): string {
  return record.kind === 'classified' ? record.jobTitle : record.academicTitle
}

function jobKey(record: FallRecord): string | null {
  const { code } = record.payDepartment
  return code === null
    ? null
    : [code, record.jobStartDate, titleOf(record), record.jobType].join('|')
}

type NameParts = { surname: string; given: string; initial: string }

/** Most letters a misspelt surname or given name may differ by and still be linked without review. */
export const MAX_SPELLING_EDITS = 2

const NOT_A_LETTER = /[^a-z]/g

/** The surname, first given name and middle initial, lower-cased with everything but letters dropped. */
function nameParts(name: string): NameParts {
  const [surname = '', rest = ''] = name.toLowerCase().split(',')
  const [given = '', middle = ''] = rest.trim().split(/\s+/)
  return {
    surname: surname.replace(NOT_A_LETTER, ''),
    given: given.replace(NOT_A_LETTER, ''),
    initial: middle.replace(NOT_A_LETTER, '').slice(0, 1),
  }
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (const [i, charA] of [...a].entries()) {
    const current = [i + 1]
    for (const [j, charB] of [...b].entries()) {
      current.push(
        Math.min(
          (previous[j + 1] ?? 0) + 1,
          (current[j] ?? 0) + 1,
          (previous[j] ?? 0) + (charA === charB ? 0 : 1),
        ),
      )
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

function initialsAgree(a: NameParts, b: NameParts): boolean {
  return a.initial === b.initial || a.initial === '' || b.initial === ''
}

/**
 * A new surname with the given name and a middle initial both kept, on an
 * unchanged job. The rule records no reason for the change.
 */
export function keepsGivenNames(a: string, b: string): boolean {
  const [partsA, partsB] = [nameParts(a), nameParts(b)]
  return (
    partsA.surname !== partsB.surname &&
    partsA.given === partsB.given &&
    partsA.initial !== '' &&
    partsA.initial === partsB.initial
  )
}

/** The same name once case and punctuation are dropped, a middle initial on one name only allowed. */
export function differsOnlyByInitial(a: string, b: string): boolean {
  const [partsA, partsB] = [nameParts(a), nameParts(b)]
  return (
    partsA.surname === partsB.surname &&
    partsA.given === partsB.given &&
    initialsAgree(partsA, partsB)
  )
}

/** The surname or the given name, not both, misspelt by at most `MAX_SPELLING_EDITS` letters, the middle initials agreeing. */
export function differsByFewLetters(a: string, b: string): boolean {
  const [partsA, partsB] = [nameParts(a), nameParts(b)]
  const edits = [
    editDistance(partsA.surname, partsB.surname),
    editDistance(partsA.given, partsB.given),
  ]
  return (
    initialsAgree(partsA, partsB) &&
    Math.min(...edits) === 0 &&
    Math.max(...edits) <= MAX_SPELLING_EDITS
  )
}

/** The same surname and given name with a different middle initial, on an unchanged job. */
export function changesMiddleInitial(a: string, b: string): boolean {
  const [partsA, partsB] = [nameParts(a), nameParts(b)]
  return (
    partsA.surname === partsB.surname &&
    partsA.given === partsB.given &&
    partsA.initial !== '' &&
    partsB.initial !== '' &&
    partsA.initial !== partsB.initial
  )
}

/** A candidate a rule links without review; a new surname or a new middle initial only on an unchanged job. */
export function isLinkedByRule({
  names: [a, b],
  reason,
}: Pick<NamePair, 'names' | 'reason'>): boolean {
  const isUnchangedJob = reason === 'same-job'
  return (
    differsOnlyByInitial(a, b) ||
    differsByFewLetters(a, b) ||
    (isUnchangedJob && (keepsGivenNames(a, b) || changesMiddleInitial(a, b)))
  )
}

function sharesOneName(a: string, b: string): boolean {
  const [partsA, partsB] = [nameParts(a), nameParts(b)]
  return partsA.surname === partsB.surname || partsA.given === partsB.given
}

/** Each job key held by exactly one record whose name the other census lacks. */
function uniqueJobs(
  records: FallRecord[],
  otherNames: Set<string>,
): Map<string, FallRecord> {
  const counts = new Map<string, number>()
  const jobs = new Map<string, FallRecord>()
  for (const record of records) {
    const key = jobKey(record)
    if (key === null) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (!otherNames.has(record.name)) jobs.set(key, record)
  }
  return new Map([...jobs].filter(([key]) => counts.get(key) === 1))
}

function sameJobPairs(ordered: FallYear[]): NamePair[] {
  return ordered.slice(1).flatMap((next, i) => {
    const current = ordered[i]?.records ?? []
    const currentNames = new Set(current.map(({ name }) => name))
    const nextNames = new Set(next.records.map(({ name }) => name))
    const earlier = uniqueJobs(current, nextNames)
    const later = uniqueJobs(next.records, currentNames)
    return [...earlier].flatMap(([key, from]): NamePair[] => {
      const to = later.get(key)
      return to && sharesOneName(from.name, to.name) && from.payDepartment.code
        ? [
            {
              names: [from.name, to.name],
              code: from.payDepartment.code,
              reason: 'same-job',
            },
          ]
        : []
    })
  })
}

/** Names in one pay department that match once case, punctuation and middle names are dropped, and never appear in the same census. */
function spellingPairs(ordered: FallYear[]): NamePair[] {
  const groups = new Map<
    string,
    { code: string; years: Map<string, number[]> }
  >()
  ordered.forEach(({ records }, yearIndex) => {
    for (const { name, payDepartment } of records) {
      if (payDepartment.code === null) continue
      const { surname, given } = nameParts(name)
      const key = `${surname},${given}|${payDepartment.code}`
      const group = groups.get(key) ?? {
        code: payDepartment.code,
        years: new Map(),
      }
      const years = group.years.get(name) ?? []
      if (years.at(-1) !== yearIndex) years.push(yearIndex)
      group.years.set(name, years)
      groups.set(key, group)
    }
  })
  return [...groups.values()].flatMap(({ code, years }) => {
    const names = [...years].sort(([, a], [, b]) => (a[0] ?? 0) - (b[0] ?? 0))
    return names.slice(1).flatMap(([later, laterYears], i): NamePair[] => {
      const [earlier = '', earlierYears = []] = names[i] ?? []
      const overlaps = laterYears.some((year) => earlierYears.includes(year))
      return overlaps
        ? []
        : [{ names: [earlier, later], code, reason: 'spelling' }]
    })
  })
}

function pairKey({ names: [a, b] }: NamePair): string {
  return `${a}|${b}`
}

/** Every pair of names that an unchanged job or a spelling variant suggests is one person, each pair once, under its unchanged-job reason where it has both. */
export function findNamePairs(falls: FallYear[]): NamePair[] {
  const ordered = [...falls].sort((a, b) =>
    a.censusDate.localeCompare(b.censusDate),
  )
  const byPair = new Map<string, NamePair>()
  for (const candidate of [
    ...sameJobPairs(ordered),
    ...spellingPairs(ordered),
  ]) {
    const key = pairKey(candidate)
    if (!byPair.has(key)) byPair.set(key, candidate)
  }
  return [...byPair.values()].sort((a, b) =>
    pairKey(a).localeCompare(pairKey(b), 'en'),
  )
}
