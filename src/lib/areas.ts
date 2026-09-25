import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'

type Orgs = BudgetYear['orgs']

/**
 * A pay department's college or VP area (a level-3 budget org code). `name`
 * and `hand` assignments are the site's, not UO's.
 */
export type AreaAssignment =
  | { area: string; basis: 'published' | 'name' | 'hand' }
  | { area: null; basis: 'unassigned' }

export const ORG_LEVEL_AREA = 3
const ORG_LEVEL_UNIT = 5

const ADMINISTRATIVE_SERVICES = '410211'
const ARTS_AND_SCIENCES = '222000'
const HEALTH_SERVICES = '490000'
const KNIGHT_CAMPUS = '110400'
const LAW = '228000'
const PRESIDENT = '100100'
const PROVOST = '120000'
const RESEARCH = '600000'

/**
 * Per census, the pay codes neither its budget hierarchy nor a department-name
 * prefix places, each beside the published unit it is assigned by.
 */
export const HAND_AREAS: Readonly<
  Record<number, Readonly<Record<string, string>>>
> = {
  2025: {
    '410201': ADMINISTRATIVE_SERVICES, // FASS units 410202-410207
    '410212': ADMINISTRATIVE_SERVICES, // 410211 Administrative Services
    '267500': HEALTH_SERVICES, // 267501 Counseling Center Ops
    '266300': PROVOST, // 266601 Mus of Nat & Cult Hist
    '266600': PROVOST, // 266601 Mus of Nat & Cult Hist
    '106003': PRESIDENT, // 106310 US Office of Governmnt & Comm Relat
    '223991': ARTS_AND_SCIENCES, // CASDAS: CAS administrative services
    '223995': ARTS_AND_SCIENCES, // CASDAS: CAS administrative services
    '223997': ARTS_AND_SCIENCES, // CASDAS: CAS administrative services
    '632110': ARTS_AND_SCIENCES, // 222660 CAS NW Indian Lang Inst
    '210155': LAW, // 228920 Wayne Morse Center Ops
    '228841': LAW, // 228840 Law CRES
    '611116': RESEARCH, // name only
    '100000': PROVOST, // name only
    // 110402-110662 in the budget are all Knight Campus units
    '110431': KNIGHT_CAMPUS,
    '110453': KNIGHT_CAMPUS,
    '110510': KNIGHT_CAMPUS,
    '110511': KNIGHT_CAMPUS,
    '110512': KNIGHT_CAMPUS,
    '110513': KNIGHT_CAMPUS,
    '110514': KNIGHT_CAMPUS,
    '110515': KNIGHT_CAMPUS,
    '110521': KNIGHT_CAMPUS,
    '110522': KNIGHT_CAMPUS,
    '110532': KNIGHT_CAMPUS,
    '110651': KNIGHT_CAMPUS,
  },
}

/** The area a published org code sits in: itself at level 3, or its parent. */
export function publishedArea(code: string | null, orgs: Orgs): string | null {
  const org = code === null ? undefined : orgs[code]
  if (!org) return null
  return org.level === ORG_LEVEL_AREA ? code : org.parent
}

function namePrefix(name: string): string {
  return name.split(' ')[0] ?? ''
}

/** Prefixes whose every published unit, in the budget or the census, sits in one area. */
function learnPrefixAreas(
  records: FallRecord[],
  orgs: Orgs,
): Map<string, string> {
  const areasByPrefix = new Map<string, Set<string>>()
  const note = (name: string, area: string) => {
    const prefix = namePrefix(name)
    const areas = areasByPrefix.get(prefix) ?? new Set()
    areasByPrefix.set(prefix, areas.add(area))
  }
  for (const org of Object.values(orgs)) {
    if (org.level === ORG_LEVEL_UNIT && org.parent) note(org.name, org.parent)
  }
  for (const { payDepartment } of records) {
    const area = publishedArea(payDepartment.code, orgs)
    if (area) note(payDepartment.name, area)
  }
  return new Map(
    [...areasByPrefix].flatMap(([prefix, areas]) => {
      const [only, ...others] = areas
      return only && others.length === 0 ? [[prefix, only]] : []
    }),
  )
}

/** An assigner for one census, using the budget year that contains it. */
export function createAreaAssigner(
  records: FallRecord[],
  orgs: Orgs,
  censusYear: number,
): (record: FallRecord) => AreaAssignment {
  const prefixAreas = learnPrefixAreas(records, orgs)
  const handAreas = HAND_AREAS[censusYear] ?? {}
  return ({ payDepartment }) => {
    const published = publishedArea(payDepartment.code, orgs)
    if (published) return { area: published, basis: 'published' }
    const byName = prefixAreas.get(namePrefix(payDepartment.name))
    if (byName) return { area: byName, basis: 'name' }
    const byHand =
      payDepartment.code === null ? undefined : handAreas[payDepartment.code]
    if (byHand) return { area: byHand, basis: 'hand' }
    return { area: null, basis: 'unassigned' }
  }
}

/** A budget year's college or VP areas, by name. */
export function listAreas(orgs: Orgs): { code: string; name: string }[] {
  return Object.entries(orgs)
    .filter(([, org]) => org.level === ORG_LEVEL_AREA)
    .map(([code, org]) => ({ code, name: org.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
