import { useSuspenseQueries } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { PayChangesSection } from '@/components/pay-changes-section'
import { SourceCitation } from '@/components/source-citation'
import { TrendsControls } from '@/components/trends-controls'
import { TrendsFigure } from '@/components/trends-figure'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePayChanges } from '@/components/use-pay-changes'
import { censusYearOf, type FallYear } from '@/data/fall'
import { fallYearQuery } from '@/data/queries'
import { SPEND_METHOD } from '@/lib/overview'
import { filterNames } from '@/lib/pay-changes'
import {
  EXEC_OTHER_CATEGORY,
  EXECUTIVE_GRADE,
  publishedCategoriesOf,
  TREND_GROUPS,
  type TrendGroup,
} from '@/lib/trend-groups'
import { buildTrends, MIN_JOBS_SHOWN, type Trends } from '@/lib/trends'
import {
  type CensusMetric,
  CHANGE_METRIC,
  METRIC_INFO,
  resolveTrendView,
  seriesWithMetric,
  type TrendsSearch,
  type TrendView,
} from '@/lib/trends-search'

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

function toFallYears(results: { data: FallYear }[]) {
  return results.map(({ data }) => data)
}

function useTrends() {
  const { years } = useLoaderData({ from: '/trends' })
  const search = useSearch({ from: '/trends' })
  const fallYears = useSuspenseQueries({
    queries: years.map(fallYearQuery),
    combine: toFallYears,
  })
  const censuses = useMemo(
    () =>
      fallYears.map(({ censusDate, records }) => ({
        year: censusYearOf(censusDate),
        records,
      })),
    [fallYears],
  )
  const view = resolveTrendView(search, years)
  const { kind, group, dept, position, from, to } = view
  const trends = useMemo(
    () => buildTrends(censuses, { kind, group, dept, position, from, to }),
    [censuses, kind, group, dept, position, from, to],
  )
  const names = useMemo(
    () => filterNames(censuses, { dept, position }),
    [censuses, dept, position],
  )
  const changes = usePayChanges(fallYears, years, view)
  return { years, view, trends, names, changes }
}

function CensusSection({
  trends,
  view,
  metric,
}: {
  trends: Trends
  view: TrendView
  metric: CensusMetric
}) {
  const title = `${METRIC_INFO[metric].label} by ${view.group ? `EEO category in ${view.group}` : 'group'}, Fall ${view.from}-${view.to}`
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <TrendsFigure
        trends={trends}
        metric={metric}
        hidden={view.hide}
        label={title}
      />
      <SourceCitation
        source={{ kind: 'fall-range', from: view.from, to: view.to }}
        computed={COMPUTED}
      />
    </section>
  )
}

export function TrendsPage() {
  const navigate = useNavigate({ from: '/trends' })
  const { years, view, trends, names, changes } = useTrends()
  const { metric } = view
  const series =
    metric === CHANGE_METRIC ? [] : seriesWithMetric(trends.series, metric)
  const handleChange = (patch: TrendsSearch) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }) })
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">
        University of Oregon employees over time
      </h1>
      <TrendsControls
        view={view}
        years={years}
        lines={(changes?.series ?? series).map(({ key }) => key)}
        names={names}
        onChange={handleChange}
      />
      {metric === CHANGE_METRIC ? (
        changes && (
          <PayChangesSection
            changes={changes}
            view={view}
            onChange={handleChange}
          />
        )
      ) : (
        <CensusSection
          trends={{ series, total: trends.total }}
          view={view}
          metric={metric}
        />
      )}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Groups</h2>
        <p className="text-sm text-muted-foreground">
          UO restructured its EEO categories in 2018, 2019, and 2021. This site
          groups them so each group means the same jobs in every year. Open a
          group to see its categories as published.
        </p>
        <GroupMapping />
      </section>
    </div>
  )
}
