import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { PeopleControls } from '@/components/people-controls'
import { PeopleTable } from '@/components/people-table'
import { SalaryDistributionFigure } from '@/components/salary-distribution-figure'
import { SortControls } from '@/components/sort-controls'
import { SourceCitation } from '@/components/source-citation'
import { TotalsChart } from '@/components/totals-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCensusPlace } from '@/components/use-census-place'
import type { FallRecord } from '@/data/fall'
import { peopleIndexQuery } from '@/data/queries'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/format'
import {
  binsInRange,
  countNames,
  distinctValues,
  filterPeopleJobs,
  groupSummary,
  type PeopleView,
  pageOf,
  resolvePeopleView,
  sortJobs,
} from '@/lib/people-list'
import {
  PEOPLE_CHARTS,
  type PeopleChart,
  type PeopleSearch,
  type PeopleSort,
  type SortDirection,
} from '@/lib/people-search'
import { titleOf } from '@/lib/person-fields'
import { formatYearRanges, matchPeople, yearsOf } from '@/lib/person-lookup'
import {
  buildDistribution,
  RATE_NOTE,
  type SalaryBin,
} from '@/lib/salary-distribution'
import { MIN_JOBS_SHOWN } from '@/lib/trends'
import { cn } from '@/lib/utils'

const CENTS_PER_DOLLAR = 100
const NUMBER_CELL = 'text-right tabular-nums'
const CHART_LABELS: Record<PeopleChart, string> = {
  rates: 'Salary rates',
  groups: 'By group',
}
const COMPUTED = `the list shows each job as published, in the order chosen, ties by name. A name or title matches when it holds every word typed, ignoring case and commas, and the rate range includes both ends. The charts count each job once, in the $10,000 range its published rate falls in or in its group as on the Trends page. Percentiles and medians are over primary jobs, temporaries left out, and need ${MIN_JOBS_SHOWN} of them. Charts over fewer than ${MIN_JOBS_SHOWN} jobs are not shown.`

function usePeople() {
  const { years, year, fiscalYear } = useLoaderData({ from: '/people' })
  const search = useSearch({ from: '/people' })
  const view = useMemo(() => resolvePeopleView(search, years), [search, years])
  const { records, areas, place, placed, positionName } = useCensusPlace({
    year,
    fiscalYear,
    dept: view.dept,
    position: view.position,
  })
  const jobs = useMemo(() => filterPeopleJobs(placed, view), [placed, view])
  const sorted = useMemo(() => sortJobs(jobs, view), [jobs, view])
  const titles = useMemo(() => distinctValues(records, titleOf), [records])
  const categories = useMemo(
    () => distinctValues(records, (record) => record.eeoCategory),
    [records],
  )
  return {
    search,
    years,
    view,
    controls: { years, areas, place, positionName, titles, categories },
    jobs,
    sorted,
  }
}

function ChartTabs({ chart }: { chart: PeopleChart }) {
  return (
    <nav aria-label="Chart">
      <ul className="flex flex-wrap gap-1 border-b">
        {PEOPLE_CHARTS.map((option) => (
          <li key={option}>
            <Link
              to="/people"
              search={(previous) => ({ ...previous, chart: option })}
              replace
              aria-current={option === chart ? 'page' : undefined}
              className={cn(
                'block rounded-t-md px-3 py-1 text-sm',
                option === chart
                  ? 'border border-b-0 bg-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {CHART_LABELS[option]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function GroupFigure({ jobs, view }: { jobs: FallRecord[]; view: PeopleView }) {
  const rows = groupSummary(jobs, view.year)
  return (
    <section className="space-y-4">
      <TotalsChart
        bars={rows.map(({ group, jobs: count }) => ({
          key: group,
          value: count,
        }))}
        valueLabel="Jobs"
        format={formatCount}
        label={`Matching jobs by group, Fall ${view.year}`}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Group</TableHead>
            <TableHead scope="col" className="text-right">
              Jobs
            </TableHead>
            <TableHead scope="col" className="text-right">
              Median rate, primary jobs
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ group, jobs: count, medianRateCents }) => (
            <TableRow key={group}>
              <TableHead scope="row" className="font-normal">
                {group}
              </TableHead>
              <TableCell className={NUMBER_CELL}>
                {formatCount(count)}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(medianRateCents, formatDollars)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function SummaryChart({
  jobs,
  view,
  onSelectBin,
}: {
  jobs: FallRecord[]
  view: PeopleView
  onSelectBin: (bin: SalaryBin) => void
}) {
  if (jobs.length === 0) return null
  if (jobs.length < MIN_JOBS_SHOWN) {
    return (
      <p>The charts are shown for {MIN_JOBS_SHOWN} or more matching jobs.</p>
    )
  }
  return (
    <div className="space-y-4">
      <ChartTabs chart={view.chart} />
      {view.chart === 'rates' ? (
        <SalaryDistributionFigure
          distribution={binsInRange(buildDistribution(jobs, view.year), view)}
          label={`Matching jobs by salary rate, Fall ${view.year}`}
          onSelectBin={onSelectBin}
          isCollapsed
        />
      ) : (
        <GroupFigure jobs={jobs} view={view} />
      )}
    </div>
  )
}

function Pager({ page, pageCount }: { page: number; pageCount: number }) {
  const turn = (to: number, text: string) =>
    to < 1 || to > pageCount ? (
      <span className="text-muted-foreground">{text}</span>
    ) : (
      <Link
        className="underline"
        to="/people"
        search={(previous) => ({ ...previous, page: to })}
      >
        {text}
      </Link>
    )
  return (
    <nav aria-label="Pages" className="flex gap-4 text-sm">
      {turn(page - 1, 'Previous')}
      <span className="tabular-nums">
        Page {formatCount(page)} of {formatCount(pageCount)}
      </span>
      {turn(page + 1, 'Next')}
    </nav>
  )
}

function OtherCensusNames({ q, year }: { q: string; year: number }) {
  const { data } = useQuery(peopleIndexQuery(useQueryClient()))
  if (!data) return <p>Looking for “{q}” in the other Fall censuses…</p>
  const found = matchPeople(data.people, q)
  if (!found || found.total === 0) return <p>No name matches “{q}”.</p>
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Names matching “{q}” in any Fall census</h2>
      <ul aria-label="Matching names" className="space-y-1">
        {found.matches.map((person) => (
          <li key={person.name} className="flex flex-wrap gap-x-2">
            <Link
              className="underline"
              to="/people/$name"
              params={{ name: person.name }}
            >
              {person.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              Fall {formatYearRanges(yearsOf(person))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {formatCount(found.matches.length)} of {formatCount(found.total)} names.
        None has a job matching these filters in Fall {year}.
      </p>
    </section>
  )
}

function binRangeSearch({ floorCents, ceilingCents }: SalaryBin): PeopleSearch {
  return {
    min: floorCents / CENTS_PER_DOLLAR,
    max:
      ceilingCents === null ? undefined : ceilingCents / CENTS_PER_DOLLAR - 1,
  }
}

export function PeoplePage() {
  const navigate = useNavigate({ from: '/people' })
  const { search, view, controls, jobs, sorted } = usePeople()
  const shown = pageOf(sorted, view.page)
  const change = (patch: PeopleSearch, replace = false) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: undefined }),
      replace,
    })
  const handleSort = (sort: PeopleSort, dir: SortDirection) =>
    change({ sort, dir })
  return (
    <div className="space-y-6">
      <meta name="robots" content="noindex" />
      <h1 className="text-2xl font-semibold">People, Fall {view.year}</h1>
      <p className="text-sm text-muted-foreground">
        Every job the Fall {view.year} Census salary reports publish, by name,
        as published. {RATE_NOTE}
      </p>
      <PeopleControls
        view={view}
        {...controls}
        onChange={(patch) => change(patch)}
        onType={(patch) => change(patch, true)}
      />
      <p className="font-medium">
        {formatCount(jobs.length)} jobs, {formatCount(countNames(jobs))} names
        match
      </p>
      <SummaryChart
        jobs={jobs}
        view={view}
        onSelectBin={(bin) => change(binRangeSearch(bin))}
      />
      {view.q && jobs.length === 0 && (
        <OtherCensusNames q={view.q} year={view.year} />
      )}
      {jobs.length > 0 && (
        <section className="space-y-3">
          <SortControls view={view} onSort={handleSort} />
          <PeopleTable rows={shown.rows} view={view} onSort={handleSort} />
          <Pager page={shown.page} pageCount={shown.pageCount} />
        </section>
      )}
      <p className="text-sm">
        <Link
          className="underline"
          to="/salaries"
          search={{
            year: search.year,
            group: search.group,
            kind: search.kind,
            term: search.term,
            dept: search.dept,
            position: search.position,
          }}
        >
          Salary distribution without names, Fall {view.year}
        </Link>
      </p>
      <SourceCitation
        source={{ kind: 'fall', year: view.year }}
        computed={COMPUTED}
      />
    </div>
  )
}
