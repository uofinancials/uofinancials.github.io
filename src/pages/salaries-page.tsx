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
import { describeCode } from '@/lib/department-index'
import { MIN_JOBS_SHOWN, toDepartmentCensus } from '@/lib/department-jobs'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/format'
import {
  jobsInView,
  resolveSalariesView,
  type SalariesSearch,
} from '@/lib/salaries-search'
import {
  binLabel,
  binRange,
  buildDistribution,
  type Distribution,
  JOB_KINDS,
  PERCENTILES,
  stackedCounts,
} from '@/lib/salary-distribution'

const NUMBER_CELL = 'text-right tabular-nums'
const RATE_NOTE =
  'Rates are the annual salary rates UO publishes, not pay: a 9-month rate is the 9-month salary, a part-time job’s rate is its full-time rate, and classified temporaries’ rates are annualised hourly rates. Dollars are as published, not adjusted for inflation.'
const COMPUTED = `each job is counted once in the $10,000 range its published rate falls in, with lower bounds included. Percentiles are over primary jobs, temporaries left out, interpolated between ranks. Figures covering fewer than ${MIN_JOBS_SHOWN} jobs are not shown.`

function BinTable({ distribution }: { distribution: Distribution }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Salary rate</TableHead>
          {JOB_KINDS.map((kind) => (
            <TableHead key={kind} scope="col" className="text-right">
              {kind}
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
            {JOB_KINDS.map((kind) => (
              <TableCell key={kind} className={NUMBER_CELL}>
                {formatCount(bin.counts[kind])}
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

function Summary({ distribution }: { distribution: Distribution }) {
  const { counts, percentiles, maxRateCents } = distribution
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {JOB_KINDS.map((kind) => (
        <div key={kind} className="contents">
          <dt className="text-muted-foreground">{kind}</dt>
          <dd className="tabular-nums">{formatCount(counts[kind])}</dd>
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

function useSalariesData() {
  const { years, year, fiscalYear } = useLoaderData({ from: '/salaries' })
  const { data: fall } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  const census = useMemo(
    () => toDepartmentCensus({ year, records: fall.records }, budget),
    [year, fall, budget],
  )
  return { years, census, budget }
}

export function SalariesPage() {
  const search = useSearch({ from: '/salaries' })
  const navigate = useNavigate({ from: '/salaries' })
  const { years, census, budget } = useSalariesData()
  const view = resolveSalariesView(search, years)
  const areas = useMemo(() => listAreas(budget.orgs), [budget])
  const { year, dept, group, kind, term } = view
  const jobs = useMemo(
    () => jobsInView(census, { year, dept, group, kind, term }),
    [census, year, dept, group, kind, term],
  )
  const distribution = useMemo(() => buildDistribution(jobs), [jobs])
  const profile =
    view.dept === null ? null : describeCode(view.dept, [census], [budget])
  const department =
    profile && !profile.isArea
      ? { code: profile.code, name: profile.name }
      : null
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
        department={department}
        onChange={handleChange}
      />
      {view.dept !== null && !profile && (
        <p>
          No jobs for code {view.dept} in Fall {view.year}.
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
            series={stackedCounts(distribution)}
            label={`${title}: jobs by salary rate`}
          />
          <Summary distribution={distribution} />
          <BinTable distribution={distribution} />
        </section>
      )}
      <SourceCitation
        source={{ kind: 'fall', year: view.year }}
        computed={COMPUTED}
      />
    </div>
  )
}
