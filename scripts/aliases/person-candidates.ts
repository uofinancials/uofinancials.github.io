import type { FallRecord, FallYear } from '../../src/data/fall.ts'

export type PersonCandidateReason = 'same-job' | 'spelling'

/** Two published names that may be one person, the earlier first, and the pay department they share. */
export type PersonCandidate = {
  names: readonly [string, string]
  code: string
  reason: PersonCandidateReason
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

/** The surname and the first given name, lower-cased with punctuation dropped. */
function nameParts(name: string): [string, string] {
  const [surname = '', given = ''] = name
    .toLowerCase()
    .replace(/[^a-z, ]/g, '')
    .split(',')
  return [surname.trim(), given.trim().split(' ')[0] ?? '']
}

function sharesOneName(a: string, b: string): boolean {
  const [surnameA, givenA] = nameParts(a)
  const [surnameB, givenB] = nameParts(b)
  return surnameA === surnameB || givenA === givenB
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

function sameJobPairs(ordered: FallYear[]): PersonCandidate[] {
  return ordered.slice(1).flatMap((next, i) => {
    const current = ordered[i]?.records ?? []
    const currentNames = new Set(current.map(({ name }) => name))
    const nextNames = new Set(next.records.map(({ name }) => name))
    const earlier = uniqueJobs(current, nextNames)
    const later = uniqueJobs(next.records, currentNames)
    return [...earlier].flatMap(([key, from]): PersonCandidate[] => {
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
function spellingPairs(ordered: FallYear[]): PersonCandidate[] {
  const groups = new Map<
    string,
    { code: string; years: Map<string, number[]> }
  >()
  ordered.forEach(({ records }, yearIndex) => {
    for (const { name, payDepartment } of records) {
      if (payDepartment.code === null) continue
      const key = `${nameParts(name).join(',')}|${payDepartment.code}`
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
    return names
      .slice(1)
      .flatMap(([later, laterYears], i): PersonCandidate[] => {
        const [earlier = '', earlierYears = []] = names[i] ?? []
        const overlaps = laterYears.some((year) => earlierYears.includes(year))
        return overlaps
          ? []
          : [{ names: [earlier, later], code, reason: 'spelling' }]
      })
  })
}

function pairKey({ names: [a, b] }: PersonCandidate): string {
  return `${a}|${b}`
}

/** Every pair of names that an unchanged job or a spelling variant suggests is one person. */
export function findPersonCandidates(falls: FallYear[]): PersonCandidate[] {
  const ordered = [...falls].sort((a, b) =>
    a.censusDate.localeCompare(b.censusDate),
  )
  const byPair = new Map<string, PersonCandidate>()
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
