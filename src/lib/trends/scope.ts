import type { AreaTrends, ScopeTrends } from '../../data/summary.ts'
import { ALL_OF_UO } from './compare.ts'
import type { ChangeSeries } from './pay-changes.ts'
import type { Trends } from './trends.ts'

/** What the report's filters pick: all of UO, a college or VP area, or a unit within it, with the figures every tab reads. */
export type ReportScope = {
  name: string
  trends: Trends
  payChanges: ChangeSeries[]
  area: ScopeTrends | null
  unit: ScopeTrends | null
}

/** The scope a search's area file and unit name; all of UO without an area, and the whole area when the unit is not one of its own. */
export function reportScope(
  all: { trends: Trends; payChanges: ChangeSeries[] },
  areaFile: AreaTrends | null,
  unitCode: string | null,
): ReportScope {
  if (!areaFile) return { name: ALL_OF_UO, ...all, area: null, unit: null }
  const { units, ...area } = areaFile
  const unit = units.find(({ code }) => code === unitCode) ?? null
  const picked = unit ?? area
  return {
    name: picked.name,
    trends: picked.trends,
    payChanges: picked.payChanges,
    area,
    unit,
  }
}
