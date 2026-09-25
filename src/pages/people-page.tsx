import { useSuspenseQueries } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { PersonRecordsTable } from '@/components/person-records-table'
import { SearchField } from '@/components/search-field'
import { SourceCitation } from '@/components/source-citation'
import type { FallYear } from '@/data/fall'
import { fallYearQuery } from '@/data/queries'
import { formatCount } from '@/lib/format'
import {
  formatYearRanges,
  indexPeople,
  MIN_QUERY_CHARS,
  matchPeople,
  type Person,
  yearsOf,
} from '@/lib/person-lookup'

const SAME_NAME_NOTE =
  'UO publishes no person identifier. Records are grouped by the name exactly as published, so one name may be more than one person, and one person may appear under more than one name.'
const MATCH_NOTE = `a name matches when every word typed appears in it, ignoring case and commas. Its years are the censuses that list the name, and its department is the pay department of its primary job in the latest of them (or its first listed job, with no primary job). The same name may be more than one person.`
const LINK_NOTE =
  'linked year to year on the exact name and the same pay department of a single primary job. Computed by this site; not published by UO.'

function toPeople(results: { data: FallYear }[]): Person[] {
  return indexPeople(results.map(({ data }) => data))
}

function Matches({ people, q }: { people: Person[]; q: string }) {
  const found = matchPeople(people, q)
  if (!found) return <p>Type at least {MIN_QUERY_CHARS} characters.</p>
  if (found.total === 0) return <p>No name matches.</p>
  return (
    <div className="space-y-2">
      <ul aria-label="Matching names" className="space-y-1">
        {found.matches.map((person) => (
          <li key={person.name} className="flex flex-wrap gap-x-2">
            <Link
              className="underline"
              to="/people"
              search={{ q, name: person.name }}
            >
              {person.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              Fall {formatYearRanges(yearsOf(person))} ·{' '}
              {person.latestPayDepartment}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {formatCount(found.matches.length)} of {formatCount(found.total)} names
      </p>
    </div>
  )
}

function PersonRecords({ person }: { person: Person }) {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">{person.name}</h2>
      <p className="text-sm text-muted-foreground">{SAME_NAME_NOTE}</p>
      {person.runs.map((run) => (
        <div key={run.years[0]?.year} className="space-y-4 border-l pl-4">
          {run.isLinked && (
            <p className="text-sm">
              Fall {formatYearRanges(run.years.map(({ year }) => year))}:{' '}
              {LINK_NOTE}
            </p>
          )}
          {run.years.map(({ year, records }) => (
            <div key={year} className="space-y-2">
              <h3 className="font-semibold">Fall {year}</h3>
              <PersonRecordsTable
                records={records}
                caption={`${person.name}, Fall ${year}`}
              />
              <SourceCitation source={{ kind: 'fall', year }} />
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

export function PeoplePage() {
  const { years } = useLoaderData({ from: '/people' })
  const { q = '', name } = useSearch({ from: '/people' })
  const navigate = useNavigate({ from: '/people' })
  const people = useSuspenseQueries({
    queries: years.map(fallYearQuery),
    combine: toPeople,
  })
  const person = people.find((entry) => entry.name === name)
  const firstYear = Math.min(...years)
  const lastYear = Math.max(...years)
  return (
    <div className="space-y-6">
      <meta name="robots" content="noindex" />
      <h1 className="text-2xl font-semibold">People</h1>
      <p className="text-sm text-muted-foreground">
        Every job the Fall {firstYear}-{lastYear} Census salary reports publish
        under a name, as published.
      </p>
      <SearchField
        label="Search by name"
        value={q}
        onSearch={(value) =>
          navigate({ search: { q: value, name }, replace: true })
        }
      />
      {name !== undefined &&
        (person ? (
          <PersonRecords person={person} />
        ) : (
          <p>No Fall record is published under the name {name}.</p>
        ))}
      <Matches people={people} q={q} />
      <SourceCitation
        source={{ kind: 'fall-range', from: firstYear, to: lastYear }}
        computed={MATCH_NOTE}
      />
    </div>
  )
}
