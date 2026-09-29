import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { TotalsTable } from '@/components/charts/totals-table'
import { TAB_LINK_CLASS } from '@/components/layout/nav-link-class'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { CensusControls } from '@/components/people/census-controls'
import { ColumnPicker } from '@/components/people/column-picker'
import { PeopleControls } from '@/components/people/controls'
import { GroupJobsFigure } from '@/components/people/group-jobs-figure'
import { SalaryDistributionFigure } from '@/components/people/salary-distribution-figure'
import { SortControls } from '@/components/people/sort-controls'
import { PeopleTable } from '@/components/people/table'
import type { FallRecord } from '@/data/fall'
import { peopleIndexQuery } from '@/hooks/people-index-query'
import { type Matching, usePeople } from '@/hooks/use-people'
import { RATE_NOTE, type SalaryBin } from '@/lib/census/salary-distribution'
import { type CategoryTotals, SPEND_METHOD } from '@/lib/census/totals'
import { binRangeSearch, type PeopleView, pageOf } from '@/lib/people/list'
import { formatYearRanges, matchPeople } from '@/lib/people/person-lookup'
import {
  type ListColumn,
  PEOPLE_CHARTS,
  type PeopleChart,
  type PeopleSearch,
  type PeopleSort,
} from '@/lib/people/search'
import { formatCount } from '@/lib/shared/format'
import type { SortDirection } from '@/lib/shared/sort'
import { MIN_JOBS_SHOWN } from '@/lib/trends/trends'

const CHART_LABELS: Record<PeopleChart, string> = {
  rates: 'Salary rates',
  groups: 'By group',
}
const COMPUTED = `the list shows each job as published, in the order chosen, ties by name. A name or title matches when it holds every word typed, ignoring case and commas, and the rate range includes both ends. The charts count each job once, in the $10,000 range its published rate falls in, with lower bounds included, or in its group as on the Trends page. Percentiles and medians are over primary jobs, temporaries left out, interpolated between ranks, and need ${MIN_JOBS_SHOWN} of them. Charts over fewer than ${MIN_JOBS_SHOWN} jobs are not shown.`

function ChartTabs({ chart }: { chart: PeopleChart }) {
  return (
    <nav aria-label="Chart">
      <ul className="flex flex-wrap gap-1 border-b">
        {PEOPLE_CHARTS.map((option) => (
          <li key={option}>
            <Link
              from="/people"
              to="/people"
              search={(previous) => ({ ...previous, chart: option })}
              replace
              resetScroll={false}
              aria-current={option === chart ? 'page' : undefined}
              className={TAB_LINK_CLASS}
            >
              {CHART_LABELS[option]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SummaryChart({
  matching,
  view,
  onSelectBin,
}: {
  matching: Matching
  view: PeopleView
  onSelectBin: (bin: SalaryBin) => void
}) {
  const count = matching.jobs.length
  if (count === 0) return null
  if (count < MIN_JOBS_SHOWN) {
    return (
      <p>The charts are shown for {MIN_JOBS_SHOWN} or more matching jobs.</p>
    )
  }
  return (
    <div className="space-y-4">
      <ChartTabs chart={view.chart} />
      {view.chart === 'rates' ? (
        <SalaryDistributionFigure
          distribution={matching.distribution}
          label={`Matching jobs by salary rate, Fall ${view.year}`}
          onSelectBin={onSelectBin}
        />
      ) : (
        <GroupJobsFigure
          rows={matching.groups}
          label={`Matching jobs by group, Fall ${view.year}`}
        />
      )}
    </div>
  )
}

function Pager({ page, pageCount }: { page: number; pageCount: number }) {
  const turn = (to: number, text: string) =>
    to < 1 || to > pageCount ? (
      <span className="py-1 text-muted-foreground">{text}</span>
    ) : (
      <Link
        className="link py-1"
        from="/people"
        to="/people"
        search={(previous) => ({ ...previous, page: to })}
      >
        {text}
      </Link>
    )
  return (
    <nav aria-label="Pages" className="flex items-center gap-4 text-sm">
      {turn(page - 1, 'Previous')}
      <span className="tabular-nums">
        Page {formatCount(page)} of {formatCount(pageCount)}
      </span>
      {turn(page + 1, 'Next')}
    </nav>
  )
}

function OtherCensusNames({ q, year }: { q: string; year: number }) {
  const { data } = useQuery(peopleIndexQuery)
  if (!data) return <p>Looking for “{q}” in the other Fall censuses…</p>
  const found = matchPeople(data.people, q)
  if (!found || found.total === 0) return <p>No name matches “{q}”.</p>
  return (
    <PageSection title={`Names matching “${q}” in any Fall census`}>
      <ul aria-label="Matching names" className="space-y-1">
        {found.matches.map((person) => (
          <li key={person.name} className="flex flex-wrap gap-x-2">
            <Link
              className="link"
              to="/people/$name"
              params={{ name: person.name }}
            >
              {person.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              Fall {formatYearRanges(person.runs.flat())}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {formatCount(found.matches.length)} of {formatCount(found.total)} names.
        None has a job matching these filters in Fall {year}.
      </p>
    </PageSection>
  )
}

function CategorySpend({
  totals: { byCategory, temps, totalSpendCents },
  year,
}: {
  totals: CategoryTotals
  year: number
}) {
  return (
    <PageSection title="Salary spend by EEO category">
      <TotalsTable
        groupLabel="EEO category"
        groups={byCategory}
        totalSpendCents={totalSpendCents}
        temps={temps}
      />
      <Sources
        sources={[
          {
            kind: 'fall',
            year,
            computed: `over the matching jobs, each in its published EEO category; a person with jobs in two categories counts in both, so people do not add up to the total; ${SPEND_METHOD}`,
          },
        ]}
      />
    </PageSection>
  )
}

function JobsSection({
  sorted,
  view,
  onSort,
}: {
  sorted: FallRecord[]
  view: PeopleView
  onSort: (sort: PeopleSort, dir: SortDirection) => void
}) {
  const navigate = useNavigate({ from: '/people' })
  const shown = pageOf(sorted, view.page)
  const handleColumns = (cols: ListColumn[]) =>
    navigate({
      search: (previous) => ({ ...previous, cols }),
      replace: true,
      resetScroll: false,
    })
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <SortControls view={view} onSort={onSort} />
        <ColumnPicker columns={view.columns} onChange={handleColumns} />
      </div>
      <PeopleTable rows={shown.rows} view={view} onSort={onSort} />
      <Pager page={shown.page} pageCount={shown.pageCount} />
    </section>
  )
}

export function PeoplePage() {
  const navigate = useNavigate({ from: '/people' })
  const { years, view, census, matching } = usePeople()
  const change = (patch: PeopleSearch, replace = false) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: undefined }),
      replace,
      resetScroll: false,
    })
  const handleSort = (sort: PeopleSort, dir: SortDirection) =>
    change({ sort, dir })
  const listSources = (
    <Sources
      sources={[{ kind: 'fall', year: view.year, computed: COMPUTED }]}
    />
  )
  return (
    <div className="space-y-6">
      <meta name="robots" content="noindex" />
      <h1 className="text-title">People, Fall {view.year}</h1>
      <p className="text-sm text-muted-foreground">
        Every job the Fall {view.year} Census salary reports publish, by name,
        as published. {RATE_NOTE}
      </p>
      <PeopleControls
        view={view}
        titles={census.titles}
        categories={census.categories}
        onChange={(patch) => change(patch)}
        onType={(patch) => change(patch, true)}
      />
      <CensusControls
        view={view}
        years={years}
        areas={census.areas}
        place={census.place}
        positionName={census.positionName}
        onChange={(patch) => change(patch)}
      />
      <p className="font-medium">
        {formatCount(matching.jobs.length)} jobs,{' '}
        {formatCount(matching.nameCount)} names match
      </p>
      <SummaryChart
        matching={matching}
        view={view}
        onSelectBin={(bin) => change(binRangeSearch(bin))}
      />
      {view.q && matching.jobs.length === 0 && (
        <OtherCensusNames q={view.q} year={view.year} />
      )}
      {matching.jobs.length > 0 ? (
        <>
          <JobsSection
            sorted={matching.sorted}
            view={view}
            onSort={handleSort}
          />
          {listSources}
          <CategorySpend totals={matching.categories} year={view.year} />
        </>
      ) : (
        listSources
      )}
    </div>
  )
}
