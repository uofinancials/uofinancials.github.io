import type { AreaTrends, CodeTrend, ScopeTrends } from '../../data/summary.ts'
import type { ChangeSeries } from './pay-changes.ts'
import type { PayChangesSearch } from './search.ts'
import type { Trends } from './trends.ts'

export const ALL_OF_UO = 'All of UO'

/** What the report's filters pick: all of UO, a college or VP area, or a unit within it, with the figures every tab reads. */
export type ReportScope = {
  name: string
  trends: Trends
  payChanges: ChangeSeries[]
  area: ScopeTrends | null
  unit: ScopeTrends | null
  /** The picked area's units, empty without one. */
  units: ScopeTrends[]
  /** All of UO's totals in each census, the comparison's baseline. */
  university: CodeTrend
}

/** The scope a search's area file and unit name; all of UO without an area, and the whole area when the unit is not one of its own. */
export function reportScope(
  all: { trends: Trends; payChanges: ChangeSeries[] },
  areaFile: AreaTrends | null,
  unitCode: string | null,
): ReportScope {
  const university = { code: '', name: ALL_OF_UO, points: all.trends.total }
  if (!areaFile) {
    return {
      name: ALL_OF_UO,
      ...all,
      area: null,
      unit: null,
      units: [],
      university,
    }
  }
  const { units, ...area } = areaFile
  const unit = units.find(({ code }) => code === unitCode) ?? null
  const picked = unit ?? area
  return {
    name: picked.name,
    trends: picked.trends,
    payChanges: picked.payChanges,
    area,
    unit,
    units,
    university,
  }
}

/** The pay changes page's filter for the scope: the unit's pay department, or the area. */
export function payChangesSearchOf({
  area,
  unit,
}: ReportScope): PayChangesSearch {
  if (unit) return { dept: unit.code }
  return area ? { area: area.code } : {}
}
