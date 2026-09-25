import { z } from 'zod'
import { staffKindSchema } from '../data/fall.ts'
import { formatCompactDollars, formatDollars, formatFte } from './format.ts'
import { TREND_GROUPS } from './trend-groups.ts'
import type { TrendFilter, TrendPoint, TrendSeries } from './trends.ts'

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

export const TREND_METRICS = ['spend', 'fte', 'median'] as const
export type TrendMetric = (typeof TREND_METRICS)[number]

export const METRIC_INFO: Record<
  TrendMetric,
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
  metric: TrendMetric,
): TrendSeries[] {
  const { pick } = METRIC_INFO[metric]
  return series.filter(({ points }) =>
    points.some((point) => pick(point) !== null),
  )
}

/** The trends page's URL search params; a malformed value falls back to its default. */
export const trendsSearchSchema = z.object({
  metric: z.enum(TREND_METRICS).optional().catch(undefined),
  group: z.enum(TREND_GROUPS).optional().catch(undefined),
  hide: z.array(z.string()).optional().catch(undefined),
  kind: staffKindSchema.optional().catch(undefined),
  from: z.number().int().optional().catch(undefined),
  to: z.number().int().optional().catch(undefined),
})

export type TrendsSearch = z.infer<typeof trendsSearchSchema>

export type TrendView = TrendFilter & { metric: TrendMetric; hide: string[] }

/** The view a search asks for, with the census years clamped to those listed. */
export function resolveTrendView(
  search: TrendsSearch,
  years: number[],
): TrendView {
  const first = Math.min(...years)
  const last = Math.max(...years)
  const from = Math.min(Math.max(search.from ?? first, first), last)
  const to = Math.min(Math.max(search.to ?? last, from), last)
  return {
    metric: search.metric ?? 'spend',
    group: search.group ?? null,
    hide: search.hide ?? [],
    kind: search.kind ?? 'all',
    from,
    to,
  }
}

export const METRIC_OPTIONS = TREND_METRICS.map(
  (metric) => [metric, METRIC_INFO[metric].label] as const,
)

/** Each series' metric value per census, `null` where it has none. */
export function metricValues(
  series: TrendSeries[],
  metric: TrendMetric,
): { key: string; values: (number | null)[] }[] {
  const { pick } = METRIC_INFO[metric]
  return series.map(({ key, points }) => ({ key, values: points.map(pick) }))
}
