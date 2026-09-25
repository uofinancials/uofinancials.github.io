import { z } from 'zod'
import { orgCodeParam } from '../data/budget.ts'
import { staffKindSchema } from '../data/fall.ts'
import { resolveCensusYear } from './census-search.ts'
import { formatCompactDollars, formatDollars, formatFte } from './format.ts'
import type { TrendGroup } from './trend-groups.ts'
import { TREND_GROUPS } from './trend-groups.ts'
import {
  pairYears,
  type TrendFilter,
  type TrendPoint,
  type TrendSeries,
} from './trends.ts'

export const ALL_GROUPS = 'all'

export const GROUP_OPTIONS: [string, string][] = [
  [ALL_GROUPS, 'All groups'],
  ...TREND_GROUPS.map((group): [string, string] => [group, group]),
]

export const STAFF_KIND_OPTIONS: [string, string][] = [
  ['all', 'Classified and unclassified'],
  ['classified', 'Classified'],
  ['unclassified', 'Unclassified'],
]

/** The measures of one census's jobs, shared with the department page. */
export const CENSUS_METRICS = ['spend', 'fte', 'median'] as const
export type CensusMetric = (typeof CENSUS_METRICS)[number]

export const CHANGE_METRIC = 'change'
/** The census measures and the change in continuing jobs' rates between census pairs. */
export const TREND_METRICS = [...CENSUS_METRICS, CHANGE_METRIC] as const
export type TrendMetric = (typeof TREND_METRICS)[number]

export const CHANGE_LABEL = 'Median change in salary rate'

export const METRIC_INFO: Record<
  CensusMetric,
  {
    label: string
    pick: (point: TrendPoint) => number | null
    format: (value: number) => string
    formatAxis: (value: number) => string
  }
> = {
  spend: {
    label: 'Salary spend',
    pick: (point) => point.spendCents,
    format: formatDollars,
    formatAxis: formatCompactDollars,
  },
  fte: {
    label: 'FTE',
    pick: (point) => point.fteHundredths,
    format: formatFte,
    formatAxis: formatFte,
  },
  median: {
    label: 'Median salary rate',
    pick: (point) => point.medianRateCents,
    format: formatDollars,
    formatAxis: formatCompactDollars,
  },
}

/** The series that have a value for the metric in at least one census. */
export function seriesWithMetric(
  series: TrendSeries[],
  metric: CensusMetric,
): TrendSeries[] {
  const { pick } = METRIC_INFO[metric]
  return series.filter(({ points }) =>
    points.some((point) => pick(point) !== null),
  )
}

/** The trends page's URL search params; `pair` is the earlier census of the change measure's pair shown. A malformed value falls back to its default. */
export const trendsSearchSchema = z.object({
  metric: z.enum(TREND_METRICS).optional().catch(undefined),
  group: z.enum(TREND_GROUPS).optional().catch(undefined),
  hide: z.array(z.string()).optional().catch(undefined),
  kind: staffKindSchema.optional().catch(undefined),
  from: z.number().int().optional().catch(undefined),
  to: z.number().int().optional().catch(undefined),
  dept: orgCodeParam.optional().catch(undefined),
  position: z.string().min(1).optional().catch(undefined),
  pair: z.number().int().optional().catch(undefined),
})

export type TrendsSearch = z.infer<typeof trendsSearchSchema>

export type TrendView = TrendFilter & {
  metric: TrendMetric
  hide: string[]
  /** The earlier census of each pair in the range. */
  fromYears: number[]
  pair: number
}

export function linesLabel(group: TrendGroup | null): string {
  return group ? `EEO category in ${group}` : 'group'
}

/** The view a search asks for, with the census years clamped to those listed and a pair not in the range falling back to its latest. */
export function resolveTrendView(
  search: TrendsSearch,
  years: number[],
): TrendView {
  const first = Math.min(...years)
  const last = Math.max(...years)
  const from = Math.min(Math.max(search.from ?? first, first), last)
  const to = Math.min(Math.max(search.to ?? last, from), last)
  const fromYears = pairYears(years, from, to)
  return {
    metric: search.metric ?? 'spend',
    group: search.group ?? null,
    hide: search.hide ?? [],
    kind: search.kind ?? 'all',
    dept: search.dept ?? null,
    position: search.position ?? null,
    from,
    to,
    fromYears,
    pair:
      fromYears.length > 0 ? resolveCensusYear(search.pair, fromYears) : from,
  }
}

export const METRIC_OPTIONS = CENSUS_METRICS.map(
  (metric) => [metric, METRIC_INFO[metric].label] as const,
)

export const TREND_METRIC_OPTIONS = [
  ...METRIC_OPTIONS,
  [CHANGE_METRIC, CHANGE_LABEL] as const,
]

/** Each series' metric value per census, `null` where it has none. */
export function metricValues(
  series: TrendSeries[],
  metric: CensusMetric,
): { key: string; values: (number | null)[] }[] {
  const { pick } = METRIC_INFO[metric]
  return series.map(({ key, points }) => ({ key, values: points.map(pick) }))
}
