import { z } from 'zod'
import { orgCodeParam } from '../../data/budget.ts'
import { staffKindSchema } from '../../data/fall.ts'
import type { TrendGroup } from '../census/groups.ts'
import { TREND_GROUPS } from '../census/groups.ts'
import { TERMS } from '../census/salary-distribution.ts'
import { resolveCensusYear } from '../census/search.ts'
import {
  formatCompactDollars,
  formatCount,
  formatDollars,
  formatFte,
} from '../shared/format.ts'
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

export const TERM_OPTIONS: [string, string][] = [
  ['all', '9 and 12 months'],
  ...TERMS.map((term): [string, string] => [String(term), `${term} months`]),
]

/** The measures of one census's jobs, shared with the department page. */
export const CENSUS_METRICS = ['spend', 'fte', 'median'] as const
export type CensusMetric = (typeof CENSUS_METRICS)[number]

/** The census measures and a count of jobs, for the trends report. */
export const REPORT_METRICS = ['jobs', ...CENSUS_METRICS] as const
export type ReportMetric = (typeof REPORT_METRICS)[number]

/** How the report shows each group's growth: its change as a ranked bar, or its index over time. */
export const GROWTH_VIEWS = ['bars', 'chart'] as const
export type GrowthView = (typeof GROWTH_VIEWS)[number]

export const GROWTH_VIEW_OPTIONS = [
  ['bars', 'Change'],
  ['chart', 'Over time'],
] as const satisfies readonly (readonly [GrowthView, string])[]

/** The measure of a link made before the pay changes page, which redirects there. */
export const CHANGE_METRIC = 'change'

export const CHANGE_LABEL = 'Median change in salary rate'

export const METRIC_INFO: Record<
  ReportMetric,
  {
    label: string
    /** The label as it reads mid-sentence. */
    noun: string
    pick: (point: TrendPoint) => number | null
    format: (value: number) => string
    formatAxis: (value: number) => string
  }
> = {
  jobs: {
    label: 'Jobs',
    noun: 'jobs',
    pick: (point) => point.jobs,
    format: formatCount,
    formatAxis: formatCount,
  },
  spend: {
    label: 'Salary spend',
    noun: 'salary spend',
    pick: (point) => point.spendCents,
    format: formatDollars,
    formatAxis: formatCompactDollars,
  },
  fte: {
    label: 'FTE',
    noun: 'FTE',
    pick: (point) => point.fteHundredths,
    format: formatFte,
    formatAxis: formatFte,
  },
  median: {
    label: 'Median salary rate',
    noun: 'median salary rate',
    pick: (point) => point.medianRateCents,
    format: formatDollars,
    formatAxis: formatCompactDollars,
  },
}

/** The pay changes page's URL search params; `pair` is the earlier census of the pair whose distribution is shown. A malformed value falls back to its default. */
export const payChangesSearchSchema = z.object({
  group: z.enum(TREND_GROUPS).optional().catch(undefined),
  hide: z.array(z.string()).optional().catch(undefined),
  kind: staffKindSchema.optional().catch(undefined),
  from: z.number().int().optional().catch(undefined),
  to: z.number().int().optional().catch(undefined),
  dept: orgCodeParam.optional().catch(undefined),
  area: orgCodeParam.optional().catch(undefined),
  position: z.string().min(1).optional().catch(undefined),
  pair: z.number().int().optional().catch(undefined),
})

export type PayChangesSearch = z.infer<typeof payChangesSearchSchema>

/** The trends report's URL search params: the year range, each section's measure, and the compared area and unit. */
export const reportSearchSchema = z.object({
  from: z.number().int().optional().catch(undefined),
  to: z.number().int().optional().catch(undefined),
  growth: z.enum(REPORT_METRICS).optional().catch(undefined),
  view: z.enum(GROWTH_VIEWS).optional().catch(undefined),
  compare: z.enum(REPORT_METRICS).optional().catch(undefined),
  area: orgCodeParam.optional().catch(undefined),
  unit: orgCodeParam.optional().catch(undefined),
})

export type ReportSearch = z.infer<typeof reportSearchSchema>

/** What a `/trends` link may carry: the report's params, and those of a link made before the report, read only to redirect it. */
export const trendsSearchSchema = payChangesSearchSchema.extend({
  ...reportSearchSchema.shape,
  metric: z.literal(CHANGE_METRIC).optional().catch(undefined),
})

export type TrendsSearch = z.infer<typeof trendsSearchSchema>

/** The report's params of a `/trends` search, without those it leaves empty. */
export function pickReportParams(search: TrendsSearch): ReportSearch {
  return reportSearchSchema.parse(
    Object.fromEntries(
      Object.entries(search).filter(
        ([key, value]) =>
          value !== undefined && key in reportSearchSchema.shape,
      ),
    ),
  )
}

export type YearRange = { from: number; to: number }

export type TrendView = Omit<TrendFilter, 'jobs'> & {
  hide: string[]
  /** A college or VP area code; its jobs are placed as its department page places them. */
  area: string | null
  /** The earlier census of each pair in the range. */
  fromYears: number[]
  pair: number
}

export function linesLabel(group: TrendGroup | null): string {
  return group ? `EEO category in ${group}` : 'group'
}

/** The years a search asks for, clamped to those listed, and the earlier census of each pair in them. */
export function resolveRange(
  search: { from?: number; to?: number },
  years: number[],
): YearRange & { fromYears: number[] } {
  const first = Math.min(...years)
  const last = Math.max(...years)
  const from = Math.min(Math.max(search.from ?? first, first), last)
  const to = Math.min(Math.max(search.to ?? last, from), last)
  return { from, to, fromYears: pairYears(years, from, to) }
}

/** The view a search asks for, with the census years clamped to those listed and a pair not in the range falling back to its latest. */
export function resolveTrendView(
  search: PayChangesSearch,
  years: number[],
): TrendView {
  const { from, to, fromYears } = resolveRange(search, years)
  return {
    group: search.group ?? null,
    hide: search.hide ?? [],
    kind: search.kind ?? 'all',
    dept: search.dept ?? null,
    area: search.area ?? null,
    position: search.position ?? null,
    from,
    to,
    fromYears,
    pair:
      fromYears.length > 0 ? resolveCensusYear(search.pair, fromYears) : from,
  }
}

/** The report's year range and its pairs, and the measures of its growth and comparison sections. */
export function resolveReportView(search: ReportSearch, years: number[]) {
  return {
    ...resolveRange(search, years),
    growth: search.growth ?? 'jobs',
    view: search.view ?? 'bars',
    compare: search.compare ?? 'fte',
  }
}

export const METRIC_OPTIONS = CENSUS_METRICS.map(
  (metric) => [metric, METRIC_INFO[metric].label] as const,
)

export const REPORT_METRIC_OPTIONS = REPORT_METRICS.map(
  (metric) => [metric, METRIC_INFO[metric].label] as const,
)

/** Each series' metric value per census, `null` where it has none. */
export function metricValues(
  series: TrendSeries[],
  metric: ReportMetric,
): { key: string; values: (number | null)[] }[] {
  const { pick } = METRIC_INFO[metric]
  return series.map(({ key, points }) => ({ key, values: points.map(pick) }))
}
