import { useSuspenseQueries } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { SourceCitation } from '@/components/source-citation'
import { TrendsChart } from '@/components/trends-chart'
import { TrendsControls } from '@/components/trends-controls'
import { TrendsTable } from '@/components/trends-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { censusYearOf } from '@/data/fall'
import { fallYearQuery } from '@/data/queries'
import {
  TREND_GROUPS,
  type TrendGroup,
  UNCLASSIFIED_CATEGORY_GROUPS,
} from '@/lib/trend-groups'
import { buildTrends } from '@/lib/trends'
import {
  METRIC_INFO,
  resolveTrendView,
  seriesWithMetric,
  type TrendsSearch,
} from '@/lib/trends-search'

const COMPUTED =
  'salary spend is the published annual salary rate x FTE, summed over jobs; jobs on unpaid leave count as zero and classified temporaries are left out. FTE is each job appointment percent, summed, temporaries included. Median salary rate is the median published annual salary rate of primary jobs, temporaries left out. Dollars are as published, not adjusted for inflation. Groups are this site’s mapping of UO’s EEO categories, below.'

const GROUP_RULES: Partial<Record<TrendGroup, string>> = {
  'Classified temporaries':
    'Classified jobs with a TS position class, or none (Fall 2015). Their published rates are annualised hourly rates, so they count in FTE only.',
  Overloads:
    'Jobs of type Overload, in every year. UO publishes an Overload category from 2019; before, overloads carried the holder’s category.',
  'Classified staff': 'Every other classified job, whatever its category.',
  'Category not published': 'Unclassified jobs with no category (Fall 2017).',
}

function categoriesOf(group: TrendGroup): string {
  return Object.entries(UNCLASSIFIED_CATEGORY_GROUPS)
    .filter(([, mapped]) => mapped === group)
    .map(([category]) => category)
    .join(', ')
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
                `Unclassified jobs in the categories ${categoriesOf(group)}.`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function TrendsPage() {
  const { years } = useLoaderData({ from: '/trends' })
  const search = useSearch({ from: '/trends' })
  const navigate = useNavigate({ from: '/trends' })
  const censuses = useSuspenseQueries({ queries: years.map(fallYearQuery) })
  const view = resolveTrendView(search, years)
  const trends = buildTrends(
    censuses.map(({ data }) => ({
      year: censusYearOf(data.censusDate),
      records: data.records,
    })),
    view,
  )
  const series = seriesWithMetric(trends.series, view.metric)
  const title = `${METRIC_INFO[view.metric].label} by ${view.group ? `EEO category in ${view.group}` : 'group'}, Fall ${view.from}-${view.to}`
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
        lines={series.map(({ key }) => key)}
        onChange={handleChange}
      />
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <TrendsChart
          series={series}
          hidden={view.hide}
          metric={view.metric}
          label={title}
        />
        <TrendsTable
          series={series}
          total={trends.total}
          metric={view.metric}
        />
        <SourceCitation
          source={{ kind: 'fall-range', from: view.from, to: view.to }}
          computed={COMPUTED}
        />
      </section>
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
