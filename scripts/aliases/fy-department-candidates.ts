import { censusYearOf, type FallYear } from '../../src/data/fall.ts'
import type { FyYear } from '../../src/data/fy.ts'
import { fiscalYearOf } from '../../src/lib/census/totals.ts'
import {
  createFyCodeResolver,
  type FyCodeSources,
} from '../../src/lib/departments/fy-codes.ts'

const PREFIX_WORDS = 2

/** A unit as published, with the censuses (pay or home department) and budgets that publish it. */
type PublishedUnit = {
  code: string
  name: string
  censuses: number[]
  budgets: number[]
}

type Unresolved = {
  name: string
  fiscalYears: number[]
  jobs: number
  /** The codes a source gave the name, where it gave more than one. */
  codes: string[]
}

/** An FY department name no source resolves, with the evidence a reviewer weighs. */
export type FyNameCandidate = Unresolved & {
  /** The pay departments the name's people held in the nearest census, most people first. */
  people: { code: string; name: string; census: number; people: number }[]
  /** Units published under exactly this name in any census or budget. */
  sameName: PublishedUnit[]
  /** Units in any census or budget whose names start with the name's first words. */
  prefixUnits: PublishedUnit[]
}

export function findFyNameCandidates(
  fys: FyYear[],
  sources: FyCodeSources,
): FyNameCandidate[] {
  const units = publishedUnits(sources)
  return [...unresolvedNames(fys, sources).values()]
    .map((unresolved) => ({
      ...unresolved,
      people: peopleEvidence(unresolved, fys, sources.falls),
      sameName: units.filter((unit) => unit.name === unresolved.name),
      prefixUnits: units.filter((unit) =>
        sharesPrefix(unit.name, unresolved.name),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function unresolvedNames(
  fys: FyYear[],
  sources: FyCodeSources,
): Map<string, Unresolved> {
  const byName = new Map<string, Unresolved>()
  for (const { fiscalYear, records } of fys) {
    const resolve = createFyCodeResolver(fiscalYear, sources)
    for (const { payDepartment: name } of records) {
      const resolved = resolve(name)
      if (resolved.basis !== 'unresolved') continue
      const found = byName.get(name) ?? {
        name,
        fiscalYears: [],
        jobs: 0,
        codes: resolved.codes,
      }
      if (!found.fiscalYears.includes(fiscalYear)) {
        found.fiscalYears.push(fiscalYear)
      }
      found.jobs += 1
      byName.set(name, found)
    }
  }
  return byName
}

function peopleEvidence(
  { name: department, fiscalYears }: Unresolved,
  fys: FyYear[],
  falls: FallYear[],
): FyNameCandidate['people'] {
  const counts = new Map<string, FyNameCandidate['people'][number]>()
  for (const { fiscalYear, records } of fys) {
    if (!fiscalYears.includes(fiscalYear)) continue
    const people = new Set(
      records
        .filter((record) => record.payDepartment === department)
        .map((record) => record.name),
    )
    for (const person of people) {
      const nearest = nearestCensusWith(person, fiscalYear, falls)
      if (!nearest) continue
      const census = censusYearOf(nearest.censusDate)
      for (const [code, name] of payDepartmentsOf(person, nearest)) {
        const key = `${census} ${code}`
        const entry = counts.get(key) ?? { code, name, census, people: 0 }
        entry.people += 1
        counts.set(key, entry)
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.people - a.people)
}

function payDepartmentsOf(
  person: string,
  census: FallYear,
): Map<string, string> {
  const codes = new Map<string, string>()
  for (const { name, payDepartment } of census.records) {
    if (name === person && payDepartment.code) {
      codes.set(payDepartment.code, payDepartment.name)
    }
  }
  return codes
}

/** The census inside the fiscal year, then the one after, then the one before, that names the person. */
function nearestCensusWith(
  person: string,
  fiscalYear: number,
  falls: FallYear[],
): FallYear | undefined {
  return [fiscalYear, fiscalYear + 1, fiscalYear - 1]
    .flatMap((year) =>
      falls.filter(({ censusDate }) => fiscalYearOf(censusDate) === year),
    )
    .find(({ records }) => records.some(({ name }) => name === person))
}

function publishedUnits({ falls, budgets }: FyCodeSources): PublishedUnit[] {
  const units = new Map<string, PublishedUnit>()
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
        if (!code) continue
        const { censuses } = unit(code, name)
        if (!censuses.includes(year)) censuses.push(year)
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
