import type { FallRecord } from '../data/fall.ts'
import { isClassifiedTemp } from './overview.ts'

const NO_RANK = 'No Rank'
const OA_GRADE = /^(OA\d{2}|EXEC|CCH\d)$/

/** A job's position class code if classified, or its rank if unclassified, as published. */
export function positionOf(record: FallRecord): string | null {
  return record.kind === 'classified'
    ? (record.positionClass?.code ?? null)
    : record.rank
}

/** The jobs a person's rate is shown beside: one position class number, one rank, or one OA salary grade. */
export type PeerGroup = { key: string; label: string }

/** A classified job's class number (any letter prefix), an unclassified job's rank, or for no rank its OA salary grade; `null` for temporaries and jobs with none published. */
export function peerGroupOf(record: FallRecord): PeerGroup | null {
  if (record.kind === 'classified') {
    if (!record.positionClass || isClassifiedTemp(record)) return null
    const number = record.positionClass.code.slice(1)
    const title = record.positionClass.title ?? 'Position class'
    return { key: `class ${number}`, label: `${title} (class ${number})` }
  }
  if (record.rank === null) return null
  if (record.rank !== NO_RANK) {
    return { key: `rank ${record.rank}`, label: record.rank }
  }
  const grade = record.oaSalaryGrade
  return grade !== null && OA_GRADE.test(grade)
    ? { key: `grade ${grade}`, label: `OA salary grade ${grade}` }
    : null
}

/** A Trends class or rank as a `peerGroupOf` key: kept when it is some job's key, else the one group of the jobs whose `positionOf` it is, else as given. */
export function peerKeyFor(
  years: { records: FallRecord[] }[],
  position: string,
): string {
  const keys = new Set<string | undefined>()
  for (const { records } of years) {
    for (const record of records) {
      const key = peerGroupOf(record)?.key
      if (key === position) return position
      if (positionOf(record) === position) keys.add(key)
    }
  }
  const [only, ...others] = keys
  return only !== undefined && others.length === 0 ? only : position
}
