import { z } from 'zod'
import { staffKindSchema } from '../data/fall.ts'
import { formatCompactDollars, formatDollars, formatFte } from './format.ts'
import { TREND_GROUPS } from './trend-groups.ts'
import type { TrendFilter, TrendPoint, TrendSeries } from './trends.ts'

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
