import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { TrendsControls } from '@/components/trends/controls'
import { TrendsFigure } from '@/components/trends/figure'
import { PayChangesSection } from '@/components/trends/pay-changes-section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { censusYearOf, type FallYear } from '@/data/fall'
import { fallYearQuery, summaryQuery, toData } from '@/data/queries'
import { useDepartmentCensuses } from '@/hooks/use-department-censuses'
import { usePayChanges } from '@/hooks/use-pay-changes'
import {
  EXEC_OTHER_CATEGORY,
  EXECUTIVE_GRADE,
  publishedCategoriesOf,
  TREND_GROUPS,
  type TrendGroup,
} from '@/lib/census/groups'
import { SPEND_METHOD } from '@/lib/census/totals'
import { areaTrendFilter } from '@/lib/departments/codes'
import { AREA_PLACEMENT_METHOD } from '@/lib/departments/jobs'
import { peerKeyFor } from '@/lib/people/peer-group'
import type { SectionSource } from '@/lib/shared/citation'
import {
  ALL_GROUPS,
  type CensusMetric,
  CHANGE_METRIC,
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

const GROUP_RULES: Partial<Record<TrendGroup, string>> = {
  Executives: `Unclassified jobs in the categories ${publishedCategoriesOf('Executives').join(', ')}, or with the OA salary grade ${EXECUTIVE_GRADE} whatever their category, a grade UO publishes from Fall 2016. Opened, the jobs placed by the grade alone are one line, “${EXEC_OTHER_CATEGORY}”.`,
  'Admins and professionals': `Unclassified jobs in the categories ${publishedCategoriesOf('Admins and professionals').join(', ')}, without the ${EXECUTIVE_GRADE} grade.`,
  'Classified temporaries':
    'Classified jobs with a TS position class, or none (Fall 2015). Their published rates are annualised hourly rates, so they count in FTE only.',
  Overloads:
    'Jobs of type Overload, in every year. UO publishes an Overload category from 2019; before, overloads carried the holder’s category.',
  'Classified staff': 'Every other classified job, whatever its category.',
  'Category not published': `Unclassified jobs with no category and no ${EXECUTIVE_GRADE} grade (Fall 2017).`,
}

const EMPTY_TRENDS: Trends = { series: [], total: [] }

function GroupMapping() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Group</TableHead>
          <TableHead scope="col">Jobs in it</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {TREND_GROUPS.map((group) => (
          <TableRow key={group}>
            <TableHead scope="row" className="font-normal">
              {group}
            </TableHead>
            <TableCell className="whitespace-normal">
              {GROUP_RULES[group] ??
                `Unclassified jobs in the categories ${publishedCategoriesOf(group).join(', ')}.`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

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
  const isChange = view.metric === CHANGE_METRIC
  const trends = useMemo(() => {
    if (isChange) return null
    if (!isSummary) return buildTrends(censuses, filter)
    const full = summary.trends[group ?? ALL_GROUPS]
    return full ? sliceTrends(full, from, to) : EMPTY_TRENDS
  }, [censuses, isChange, isSummary, filter, summary, group, from, to])
  const names = useMemo(
    () => ({
      ...filterNames(censuses, { dept, position }),
      area: area?.name ?? null,
    }),
    [censuses, dept, position, area],
  )
  const changes = usePayChanges(fallYears, view, filter)
  return { years, view, trends, names, changes, area }
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
  const { years, view, trends, names, changes, area } = useTrends()
  const { metric } = view
  const census =
    trends && metric !== CHANGE_METRIC
      ? {
          metric,
          trends: {
            series: seriesWithMetric(trends.series, metric),
            total: trends.total,
          },
        }
      : null
  const lines = changes?.series ?? census?.trends.series ?? []
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
        years={years}
        lines={lines.map(({ key }) => key)}
        names={names}
        onChange={handleChange}
      />
      {changes && (
        <PayChangesSection
          changes={changes}
          view={view}
          filterSources={filterSources}
          onChange={handleChange}
        />
      )}
      {census && (
        <CensusSection {...census} view={view} filterSources={filterSources} />
      )}
      <PageSection title="Groups">
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
