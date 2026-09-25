import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { GroupJobsFigure } from '@/components/group-jobs-figure'
import { PeopleControls } from '@/components/people-controls'
import { peopleIndexQuery } from '@/components/people-index-query'
import { PeopleTable } from '@/components/people-table'
import { SalariesControls } from '@/components/salaries-controls'
import { SalaryDistributionFigure } from '@/components/salary-distribution-figure'
import { SortControls } from '@/components/sort-controls'
import { SourceCitation } from '@/components/source-citation'
import { tabLinkClass } from '@/components/tab-link-class'
import { type Matching, usePeople } from '@/components/use-people'
import { formatCount } from '@/lib/format'
import { binRangeSearch, type PeopleView, pageOf } from '@/lib/people-list'
import {
  PEOPLE_CHARTS,
  type PeopleChart,
  type PeopleSearch,
  type PeopleSort,
  type SortDirection,
} from '@/lib/people-search'
import { formatYearRanges, matchPeople, yearsOf } from '@/lib/person-lookup'
import { RATE_NOTE, type SalaryBin } from '@/lib/salary-distribution'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

const CHART_LABELS: Record<PeopleChart, string> = {
  rates: 'Salary rates',
  groups: 'By group',
}
const COMPUTED = `the list shows each job as published, in the order chosen, ties by name. A name or title matches when it holds every word typed, ignoring case and commas, and the rate range includes both ends. The charts count each job once, in the $10,000 range its published rate falls in or in its group as on the Trends page. Percentiles and medians are over primary jobs, temporaries left out, and need ${MIN_JOBS_SHOWN} of them. Charts over fewer than ${MIN_JOBS_SHOWN} jobs are not shown.`

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
              className={tabLinkClass(option === chart)}
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
          isCollapsed
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
  const { data } = useQuery(peopleIndexQuery)
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

export function PeoplePage() {
  const navigate = useNavigate({ from: '/people' })
  const { search, years, view, census, matching } = usePeople()
  const shown = pageOf(matching.sorted, view.page)
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
        titles={census.titles}
        categories={census.categories}
        onChange={(patch) => change(patch)}
        onType={(patch) => change(patch, true)}
      />
      <SalariesControls
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
      {matching.jobs.length > 0 && (
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
