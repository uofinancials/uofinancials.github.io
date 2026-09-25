import { useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { SalariesControls } from '@/components/salaries-controls'
import { SourceCitation } from '@/components/source-citation'
import { StackedBarChart } from '@/components/stacked-bar-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { budgetYearQuery, fallYearQuery } from '@/data/queries'
import { listAreas } from '@/lib/areas'
import { toDepartmentCensus } from '@/lib/department-jobs'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/format'
import {
  describePlace,
  placeJobs,
  resolveSalariesView,
  type SalariesSearch,
} from '@/lib/salaries-search'
import {
  binLabel,
  binRange,
  buildDistribution,
  type Distribution,
  filterJobs,
  PERCENTILES,
  positionLabel,
} from '@/lib/salary-distribution'
import { stackedCounts, type TrendGroup } from '@/lib/trend-groups'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

const NUMBER_CELL = 'text-right tabular-nums'
const RATE_NOTE =
  'Rates are the annual salary rates UO publishes, not pay: a 9-month rate is the 9-month salary, a part-time job’s rate is its full-time rate, and classified temporaries’ rates are annualised hourly rates. Dollars are as published, not adjusted for inflation.'
const COMPUTED = `each job is counted once in the $10,000 range its published rate falls in, with lower bounds included, in its group as on the Trends page. Percentiles are over primary jobs, temporaries left out, interpolated between ranks. Figures covering fewer than ${MIN_JOBS_SHOWN} jobs are not shown.`

function BinTable({
  distribution,
  groups,
}: {
  distribution: Distribution
  groups: TrendGroup[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Salary rate</TableHead>
          {groups.map((group) => (
            <TableHead key={group} scope="col" className="text-right">
              {group}
            </TableHead>
          ))}
          <TableHead scope="col" className="text-right">
            Total
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {distribution.bins.map((bin) => (
          <TableRow key={bin.floorCents}>
            <TableHead scope="row" className="font-normal">
              {binRange(bin)}
            </TableHead>
            {groups.map((group) => (
              <TableCell key={group} className={NUMBER_CELL}>
                {formatCount(bin.counts[group])}
              </TableCell>
            ))}
            <TableCell className={NUMBER_CELL}>
              {formatCount(bin.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Summary({
  distribution,
  groups,
}: {
  distribution: Distribution
  groups: TrendGroup[]
}) {
  const { counts, percentiles, maxRateCents } = distribution
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {groups.map((group) => (
        <div key={group} className="contents">
          <dt className="text-muted-foreground">{group}</dt>
          <dd className="tabular-nums">{formatCount(counts[group])}</dd>
        </div>
      ))}
      {PERCENTILES.map((p) => (
        <div key={p} className="contents">
          <dt className="text-muted-foreground">
            {p === 50 ? 'Median' : `${p}th percentile`} rate, primary jobs
          </dt>
          <dd className="tabular-nums">
            {formatOrBlank(percentiles?.[p], formatDollars)}
          </dd>
        </div>
      ))}
      <dt className="text-muted-foreground">Highest rate</dt>
      <dd className="tabular-nums">
        {formatOrBlank(maxRateCents, formatDollars)}
      </dd>
    </dl>
  )
}

function useSalaries() {
  const { years, year, fiscalYear } = useLoaderData({ from: '/salaries' })
  const search = useSearch({ from: '/salaries' })
  const { data: fall } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  const census = useMemo(
    () => toDepartmentCensus({ year, records: fall.records }, budget),
    [year, fall, budget],
  )
  const view = useMemo(
    () => resolveSalariesView(search, years),
    [search, years],
  )
  const areas = useMemo(() => listAreas(budget.orgs), [budget])
  const place = useMemo(
    () => describePlace(view.dept, census, budget),
    [view.dept, census, budget],
  )
  const placed = useMemo(
    () => placeJobs(census, view.dept),
    [census, view.dept],
  )
  const jobs = useMemo(
    () => filterJobs(placed, view, view.year),
    [placed, view],
  )
  const distribution = useMemo(
    () => buildDistribution(jobs, view.year),
    [jobs, view.year],
  )
  const positionName =
    view.position === null ? null : positionLabel(placed, view.position)
  return { years, view, areas, place, positionName, jobs, distribution }
}

export function SalariesPage() {
  const navigate = useNavigate({ from: '/salaries' })
  const { years, view, areas, place, positionName, jobs, distribution } =
    useSalaries()
  const stacks = stackedCounts(distribution)
  const groups = stacks.map(({ key }) => key)
  const title = `Salary rates, Fall ${view.year}`
  const handleChange = (patch: SalariesSearch) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }) })
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{RATE_NOTE}</p>
      <SalariesControls
        view={view}
        years={years}
        areas={areas}
        place={place}
        positionName={positionName}
        onChange={handleChange}
      />
      {place.scope === 'unknown' && (
        <p>
          No jobs for code {place.code} in Fall {view.year}.
        </p>
      )}
      {jobs.length < MIN_JOBS_SHOWN ? (
        <p>
          {formatCount(jobs.length)} jobs match. The distribution is shown for{' '}
          {MIN_JOBS_SHOWN} or more.
        </p>
      ) : (
        <section className="space-y-4">
          <StackedBarChart
            labels={distribution.bins.map(binLabel)}
            series={stacks}
            label={`${title}: jobs by salary rate`}
          />
          <Summary distribution={distribution} groups={groups} />
          <BinTable distribution={distribution} groups={groups} />
        </section>
      )}
      <SourceCitation
        source={{ kind: 'fall', year: view.year }}
        computed={COMPUTED}
      />
    </div>
  )
}
