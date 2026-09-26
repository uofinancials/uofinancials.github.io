import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import { handAreasFor } from './hand-areas.ts'

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
  const handAreas = new Map(
    handAreasFor(censusYear).map(({ code, area }) => [code, area]),
  )
  return ({ payDepartment }) => {
    const published = publishedArea(payDepartment.code, orgs)
    if (published) return { area: published, basis: 'published' }
    const byName = prefixAreas.get(namePrefix(payDepartment.name))
    if (byName) return { area: byName, basis: 'name' }
    const byHand =
      payDepartment.code === null
        ? undefined
        : handAreas.get(payDepartment.code)
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
