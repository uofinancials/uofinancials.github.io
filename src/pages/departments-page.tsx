import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { SearchField } from '@/components/search-field'
import { SourceCitation } from '@/components/source-citation'
import { fiscalYearLabel } from '@/data/budget'
import { budgetYearQuery, fallYearQuery } from '@/data/queries'
import {
  departmentIndex,
  filterIndex,
  type IndexEntry,
} from '@/lib/department-index'
import { formatCount, formatDollars } from '@/lib/format'

const PLACEMENT_NOTE =
  'areas and units are the budget’s level-3 and level-5 organisations. Pay departments the budget does not publish are placed in an area by a department-name prefix, or by hand, as on the overview.'

function EntryFacts({
  entry,
  fiscal,
  year,
}: {
  entry: Omit<IndexEntry, 'code'>
  fiscal: string
  year: number
}) {
  const facts = [
    entry.budgetCents === null
      ? null
      : `${fiscal} budget ${formatDollars(entry.budgetCents)}`,
    entry.jobs === 0 ? null : `${formatCount(entry.jobs)} jobs in Fall ${year}`,
  ].filter((fact) => fact !== null)
  return (
    <span className="text-sm text-muted-foreground">
      {facts.length === 0 ? 'no figures' : facts.join(' · ')}
    </span>
  )
}

export function DepartmentsPage() {
  const { year, fiscalYear } = useLoaderData({ from: '/departments' })
  const { q = '' } = useSearch({ from: '/departments' })
  const navigate = useNavigate({ from: '/departments' })
  const { data: fall } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  const index = useMemo(
    () => departmentIndex({ year, records: fall.records }, budget),
    [year, fall, budget],
  )
  const areas = filterIndex(index, q)
  const fiscal = fiscalYearLabel(fiscalYear)
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Departments</h1>
      <p className="text-sm text-muted-foreground">
        Each college or VP area in the {fiscal} budget, with its units and the
        Fall {year} pay departments placed in it. A unit’s page shows its budget
        by year; a pay department’s shows its jobs; a code both publish shows
        both.
      </p>
      <SearchField
        label="Filter by name or code"
        value={q}
        onSearch={(value) => navigate({ search: { q: value }, replace: true })}
      />
      {areas.length === 0 && <p>No area, unit, or department matches.</p>}
      {areas.map((area) => (
        <section key={area.code ?? 'unassigned'} className="space-y-2">
          <h2 className="text-lg font-semibold">
            {area.code === null ? (
              area.name
            ) : (
              <Link
                className="underline"
                to="/departments/$code"
                params={{ code: area.code }}
              >
                {area.name}
              </Link>
            )}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {area.code}
            </span>
          </h2>
          <EntryFacts entry={area} fiscal={fiscal} year={year} />
          <ul className="space-y-1 border-l pl-4">
            {area.entries.map((entry) => (
              <li key={entry.code} className="flex flex-wrap gap-x-2">
                <Link
                  className="underline"
                  to="/departments/$code"
                  params={{ code: entry.code }}
                >
                  {entry.name}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {entry.code}
                </span>
                <EntryFacts entry={entry} fiscal={fiscal} year={year} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <SourceCitation
        source={{ kind: 'budget', fiscalYear }}
        computed={PLACEMENT_NOTE}
      />
      <SourceCitation source={{ kind: 'fall', year }} />
    </div>
  )
}
