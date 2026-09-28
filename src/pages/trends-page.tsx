import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { TrendsControls } from '@/components/trends/controls'
import { TrendsFigure } from '@/components/trends/figure'
import { GroupMapping } from '@/components/trends/group-mapping'
import { censusYearOf, type FallYear } from '@/data/fall'
import { fallYearQuery, summaryQuery, toData } from '@/data/queries'
import { useDepartmentCensuses } from '@/hooks/use-department-censuses'
import { SPEND_METHOD } from '@/lib/census/totals'
import { areaTrendFilter } from '@/lib/departments/codes'
import { AREA_PLACEMENT_METHOD } from '@/lib/departments/jobs'
import { peerKeyFor } from '@/lib/people/peer-group'
import type { SectionSource } from '@/lib/shared/citation'
import {
  CENSUS_METRICS,
  type CensusMetric,
  isSummaryView,
  linesLabel,
  METRIC_INFO,
  resolveTrendView,
  seriesWithMetric,
  type TrendsSearch,
  type TrendView,
} from '@/lib/trends/search'
import {
  buildTrends,
  filterNames,
  MIN_JOBS_SHOWN,
  sliceTrends,
  type TrendFilter,
  type Trends,
} from '@/lib/trends/trends'

const COMPUTED = `${SPEND_METHOD} FTE is each job appointment percent, summed, temporaries included. Median salary rate is the median published annual salary rate of primary jobs, temporaries left out. Dollars are as published, not adjusted for inflation. Spend is left blank for any figure covering fewer than ${MIN_JOBS_SHOWN} paid jobs, and median for fewer than ${MIN_JOBS_SHOWN} primary jobs. Groups are this site’s mapping of UO’s EEO categories, below.`

function useAreaJobs(area: string | null, falls: FallYear[]) {
  const { fiscalYears } = useLoaderData({ from: '/trends' })
  const { budgets, censuses } = useDepartmentCensuses(fiscalYears, falls)
  return useMemo(
    () => (area === null ? null : areaTrendFilter(area, censuses, budgets)),
    [area, censuses, budgets],
  )
}

function useTrends() {
  const { years } = useLoaderData({ from: '/trends' })
  const search = useSearch({ from: '/trends' })
  const isSummary = isSummaryView(search)
  const { data: summary } = useSuspenseQuery(summaryQuery)
  const fallYears = useSuspenseQueries({
    queries: isSummary ? [] : years.map(fallYearQuery),
    combine: toData,
  })
  const censuses = useMemo(
    () =>
      fallYears.map(({ censusDate, records }) => ({
        year: censusYearOf(censusDate),
        records,
      })),
    [fallYears],
  )
  const resolved = resolveTrendView(search, years)
  const position = useMemo(
    () =>
      resolved.position === null
        ? null
        : peerKeyFor(censuses, resolved.position),
    [censuses, resolved.position],
  )
  const view = { ...resolved, position }
  const area = useAreaJobs(view.area, fallYears)
  const { kind, group, dept, from, to } = view
  const filter = useMemo(
    (): TrendFilter => ({
      kind,
      group,
      dept,
      position,
      jobs: area?.jobs ?? null,
      from,
      to,
    }),
    [kind, group, dept, position, area, from, to],
  )
  const trends = useMemo(() => {
    if (!isSummary) return buildTrends(censuses, filter)
    return sliceTrends(summary.trends.all, from, to)
  }, [censuses, isSummary, filter, summary, from, to])
  const names = useMemo(
    () => ({
      ...filterNames(censuses, { dept, position }),
      area: area?.name ?? null,
    }),
    [censuses, dept, position, area],
  )
  const metric = CENSUS_METRICS.find((m) => m === search.metric) ?? 'spend'
  return { years, view, metric, trends, names, area }
}

function CensusSection({
  trends,
  view,
  metric,
  filterSources,
}: {
  trends: Trends
  view: TrendView
  metric: CensusMetric
  filterSources: SectionSource[]
}) {
  const title = `${METRIC_INFO[metric].label} by ${linesLabel(view.group)}, Fall ${view.from}-${view.to}`
  return (
    <PageSection title={title}>
      <TrendsFigure
        trends={trends}
        metric={metric}
        hidden={view.hide}
        label={title}
      />
      <Sources
        sources={[
          {
            kind: 'fall-range',
            from: view.from,
            to: view.to,
            computed: COMPUTED,
          },
          ...filterSources,
        ]}
      />
    </PageSection>
  )
}

export function TrendsPage() {
  const navigate = useNavigate({ from: '/trends' })
  const { years, view, metric, trends, names, area } = useTrends()
  const shown = {
    series: seriesWithMetric(trends.series, metric),
    total: trends.total,
  }
  const filterSources: SectionSource[] = area
    ? [
        {
          kind: 'budget-range',
          ...area.fiscalYears,
          computed: AREA_PLACEMENT_METHOD,
        },
      ]
    : []
  const handleChange = (patch: TrendsSearch) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }) })
  return (
    <div className="space-y-8">
      <h1 className="text-title">University of Oregon employees over time</h1>
      <TrendsControls
        view={view}
        metric={{
          value: metric,
          onSelect: (value) => handleChange({ metric: value }),
        }}
        years={years}
        lines={shown.series.map(({ key }) => key)}
        names={names}
        onChange={handleChange}
      />
      <CensusSection
        trends={shown}
        metric={metric}
        view={view}
        filterSources={filterSources}
      />
      <p className="text-sm">
        <Link className="link" to="/trends/pay-changes">
          Pay changes of continuing jobs
        </Link>
      </p>
      <PageSection id="groups" title="Groups">
        <p className="text-sm text-muted-foreground">
          UO restructured its EEO categories in 2018, 2019, and 2021. This site
          groups them so each group means the same jobs in every year. Open a
          group to see its categories as published.
        </p>
        <GroupMapping />
      </PageSection>
    </div>
  )
}
