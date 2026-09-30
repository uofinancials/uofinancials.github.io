import { censusYearOf, type FallYear } from '../../src/data/fall.ts'
import type { FyYear } from '../../src/data/fy.ts'
import {
  createFyCodeResolver,
  type FyCodeSources,
} from '../../src/lib/departments/fy-codes.ts'

const PREFIX_WORDS = 2

type Unit = { code: string; name: string }

/** An FY department name no source resolves, with the evidence a reviewer weighs. */
export type FyNameCandidate = {
  name: string
  fiscalYears: number[]
  jobs: number
  /** The codes a source gave the name, where it gave more than one. */
  codes: string[]
  /** The pay departments the name's people held in the nearest census, most people first. */
  people: (Unit & { census: number; people: number })[]
  /** Units published under exactly this name in any census (pay or home department) or budget. */
  sameName: (Unit & { censuses: number[]; budgets: number[] })[]
  /** Units in any census or budget whose names start with the name's first words. */
  prefixUnits: Unit[]
}

export function findFyNameCandidates(
  fys: FyYear[],
  sources: FyCodeSources,
): FyNameCandidate[] {
  const byName = new Map<string, FyNameCandidate>()
  for (const { fiscalYear, records } of fys) {
    const resolve = createFyCodeResolver(fiscalYear, sources)
    for (const record of records) {
      const resolved = resolve(record.payDepartment)
      if (resolved.basis !== 'unresolved') continue
      const candidate = byName.get(record.payDepartment) ?? {
        name: record.payDepartment,
        fiscalYears: [],
        jobs: 0,
        codes: resolved.codes,
        people: [],
        sameName: [],
        prefixUnits: [],
      }
      if (!candidate.fiscalYears.includes(fiscalYear)) {
        candidate.fiscalYears.push(fiscalYear)
      }
      candidate.jobs += 1
      byName.set(record.payDepartment, candidate)
    }
  }
  const units = knownUnits(sources)
  return [...byName.values()]
    .map((candidate) => ({
      ...candidate,
      people: peopleEvidence(candidate, fys, sources.falls),
      sameName: units.filter((unit) => unit.name === candidate.name),
      prefixUnits: units
        .filter((unit) => sharesPrefix(unit.name, candidate.name))
        .map(({ code, name }) => ({ code, name })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function peopleEvidence(
  candidate: FyNameCandidate,
  fys: FyYear[],
  falls: FallYear[],
): FyNameCandidate['people'] {
  const counts = new Map<string, Unit & { census: number; people: number }>()
  for (const { fiscalYear, records } of fys) {
    if (!candidate.fiscalYears.includes(fiscalYear)) continue
    const people = new Set(
      records
        .filter((record) => record.payDepartment === candidate.name)
        .map((record) => record.name),
    )
    for (const person of people) {
      const nearest = nearestCensusWith(person, fiscalYear, falls)
      if (!nearest) continue
      const codes = new Map<string, string>()
      for (const { name, payDepartment } of nearest.records) {
        if (name === person && payDepartment.code) {
          codes.set(payDepartment.code, payDepartment.name)
        }
      }
      for (const [code, name] of codes) {
        const key = `${censusYearOf(nearest.censusDate)} ${code}`
        const entry = counts.get(key) ?? {
          code,
          name,
          census: censusYearOf(nearest.censusDate),
          people: 0,
        }
        entry.people += 1
        counts.set(key, entry)
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.people - a.people)
}

/** The census inside the fiscal year, then the one after, then the one before, that names the person. */
function nearestCensusWith(
  person: string,
  fiscalYear: number,
  falls: FallYear[],
): FallYear | undefined {
  const censusIn = fiscalYear - 1
  return [censusIn, censusIn + 1, censusIn - 1]
    .flatMap((year) =>
      falls.filter(({ censusDate }) => censusYearOf(censusDate) === year),
    )
    .find(({ records }) => records.some(({ name }) => name === person))
}

function knownUnits({
  falls,
  budgets,
}: FyCodeSources): FyNameCandidate['sameName'] {
  const units = new Map<string, FyNameCandidate['sameName'][number]>()
  const unit = (code: string, name: string) => {
    const key = `${code} ${name}`
    const found = units.get(key) ?? { code, name, censuses: [], budgets: [] }
    units.set(key, found)
    return found
  }
  for (const { censusDate, records } of falls) {
    const year = censusYearOf(censusDate)
    for (const { homeDepartment, payDepartment } of records) {
      for (const { code, name } of [homeDepartment, payDepartment]) {
        const censuses = code ? unit(code, name).censuses : []
        if (code && !censuses.includes(year)) censuses.push(year)
      }
    }
  }
  for (const { fiscalYear, orgs } of budgets) {
    for (const [code, { name }] of Object.entries(orgs)) {
      unit(code, name).budgets.push(fiscalYear)
    }
  }
  return [...units.values()].sort((a, b) => a.code.localeCompare(b.code))
}

function sharesPrefix(unitName: string, name: string): boolean {
  const prefix = name.split(' ').slice(0, PREFIX_WORDS)
  const words = unitName.split(' ')
  return (
    prefix.length === PREFIX_WORDS &&
    unitName !== name &&
    prefix.every((word, index) => words[index] === word)
  )
}
