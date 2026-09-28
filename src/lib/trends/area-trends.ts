import type { FallRecord } from '../../data/fall.ts'
import type { AreaTrends, CodeTrend } from '../../data/summary.ts'
import { departmentIndex } from '../departments/codes.ts'
import type { DepartmentCensus } from '../departments/jobs.ts'
import { measureJobs } from './trends.ts'

function groupBy(
  records: FallRecord[],
  keyOf: (record: FallRecord) => string | null,
): Map<string, FallRecord[]> {
  const groups = new Map<string, FallRecord[]>()
  for (const record of records) {
    const key = keyOf(record)
    if (key === null) continue
    const members = groups.get(key) ?? []
    members.push(record)
    groups.set(key, members)
  }
  return groups
}

/**
 * Each area of the latest census's budget year, with its units and pay
 * departments as that census's department index lists them. An area's jobs
 * are those each census places in it, and a unit's those paid under its code,
 * as their department pages count them.
 */
export function areaTrends(censuses: DepartmentCensus[]): AreaTrends[] {
  const sorted = [...censuses].sort((a, b) => a.year - b.year)
  const latest = sorted.at(-1)
  if (!latest) return []
  const placed = sorted.map((census) => ({
    year: census.year,
    byArea: groupBy(census.records, (record) => census.assign(record).area),
    byCode: groupBy(census.records, (record) => record.payDepartment.code),
  }))
  const trendOf = (
    code: string,
    name: string,
    pick: (census: (typeof placed)[number]) => Map<string, FallRecord[]>,
  ): CodeTrend => ({
    code,
    name,
    points: placed.map((census) => ({
      year: census.year,
      ...measureJobs(pick(census).get(code) ?? []),
    })),
  })
  return departmentIndex(latest).flatMap(({ code, name, entries }) =>
    code === null
      ? []
      : [
          {
            ...trendOf(code, name, ({ byArea }) => byArea),
            units: entries
              .map((entry) =>
                trendOf(entry.code, entry.name, ({ byCode }) => byCode),
              )
              .filter(({ points }) => points.some(({ jobs }) => jobs > 0)),
          },
        ],
  )
}
