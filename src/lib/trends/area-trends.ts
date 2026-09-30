import type { FallRecord } from '../../data/fall.ts'
import type { FyTemps } from '../../data/fy-temps.ts'
import type { AreaTrends, ScopeTrends } from '../../data/summary.ts'
import { departmentIndex } from '../departments/codes.ts'
import { tempsByCensus } from '../departments/fy-temps.ts'
import type { DepartmentCensus } from '../departments/jobs.ts'
import { type ContinuingPair, payChangeTrends } from './pay-changes.ts'
import { buildTrends, pairYears, type TrendFilter } from './trends.ts'

function groupBy<T>(
  items: T[],
  keyOf: (item: T) => string | null,
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    if (key === null) continue
    const members = groups.get(key) ?? []
    members.push(item)
    groups.set(key, members)
  }
  return groups
}

/** The censuses and pairs every scope is built from, the range they cover, and each scope's classified temporaries' FY figures. */
type Frame = {
  censuses: DepartmentCensus[]
  pairs: ContinuingPair[]
  filter: TrendFilter
  fromYears: number[]
  fyTemps: FyTemps
}

/** Builds a scope's trends and pay changes from the jobs and pairs whose key, by `recordKey`, is its code. */
function scopeBuilder(
  { censuses, pairs, filter, fromYears, fyTemps }: Frame,
  recordKey: (record: FallRecord, year: number) => string | null,
  kind: 'area' | 'unit',
) {
  const placed = censuses.map(({ year, records }) => ({
    year,
    records: groupBy(records, (record) => recordKey(record, year)),
  }))
  const pairsOf = groupBy(pairs, ({ from, fromYear }) =>
    recordKey(from, fromYear),
  )
  return (code: string, name: string): ScopeTrends => ({
    code,
    name,
    trends: buildTrends(
      placed.map(({ year, records }) => ({
        year,
        records: records.get(code) ?? [],
      })),
      filter,
      tempsByCensus(fyTemps, { kind, code }),
    ),
    payChanges: payChangeTrends(pairsOf.get(code) ?? [], fromYears, null),
  })
}

/**
 * Each area of the latest census's budget year, with its units and pay
 * departments as that census's department index lists them: jobs by group in
 * every census, and continuing jobs' median pay change by group for every
 * pair. An area's jobs and pairs are those each census places in it, and a
 * unit's those paid under its code or a code joined to it, as their department
 * pages count them; a pair belongs where its earlier job is.
 */
export function areaTrends(
  censuses: DepartmentCensus[],
  pairs: ContinuingPair[],
  fyTemps: FyTemps,
): AreaTrends[] {
  const sorted = [...censuses].sort((a, b) => a.year - b.year)
  const latest = sorted.at(-1)
  const first = sorted[0]
  if (!latest || !first) return []
  const frame: Frame = {
    censuses: sorted,
    pairs,
    filter: {
      kind: 'all',
      group: null,
      dept: null,
      position: null,
      jobs: null,
      from: first.year,
      to: latest.year,
    },
    fromYears: pairYears(
      sorted.map(({ year }) => year),
      first.year,
      latest.year,
    ),
    fyTemps,
  }
  const byYear = new Map(sorted.map((census) => [census.year, census]))
  const areaScope = scopeBuilder(
    frame,
    (record, year) => byYear.get(year)?.assign(record).area ?? null,
    'area',
  )
  const unitScope = scopeBuilder(
    frame,
    (record) => record.payDepartment.code,
    'unit',
  )
  return departmentIndex(latest).flatMap(({ code, name, entries }) =>
    code === null
      ? []
      : [
          {
            ...areaScope(code, name),
            units: entries
              .map((entry) => unitScope(entry.code, entry.name))
              .filter(({ trends }) =>
                trends.total.some(({ jobs }) => jobs > 0),
              ),
          },
        ],
  )
}
