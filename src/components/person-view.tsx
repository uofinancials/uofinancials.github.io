import { Link } from '@tanstack/react-router'
import { PersonCards } from '@/components/person-cards'
import { PersonHistoryTable } from '@/components/person-history-table'
import { PersonRatesFigure } from '@/components/person-rates-figure'
import { PersonRecordsTable } from '@/components/person-records-table'
import { SourceCitation } from '@/components/source-citation'
import {
  type Person,
  type PersonYear,
  personYearsOf,
} from '@/lib/person-lookup'
import { payDepartmentsOf, positionsOf, runOf } from '@/lib/person-summary'
import { cn } from '@/lib/utils'

const SAME_NAME_NOTE =
  'UO publishes no person identifier. Records are grouped by the name exactly as published, so one name may be more than one person, and one person may appear under more than one name.'

function YearTabs({ person, year }: { person: Person; year: number }) {
  return (
    <nav aria-label="Census year">
      <ul className="flex flex-wrap gap-1 border-b">
        {personYearsOf(person).map((entry) => (
          <li key={entry.year}>
            <Link
              to="/people"
              search={(previous) => ({ ...previous, year: entry.year })}
              aria-current={entry.year === year ? 'page' : undefined}
              className={cn(
                'block rounded-t-md px-3 py-1 text-sm tabular-nums',
                entry.year === year
                  ? 'border border-b-0 bg-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {entry.year}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function YearRecords({ name, entry }: { name: string; entry: PersonYear }) {
  const departments = payDepartmentsOf(entry.records)
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Fall {entry.year} records</h3>
      <PersonRecordsTable
        records={entry.records}
        caption={`${name}, Fall ${entry.year}`}
      />
      <SourceCitation source={{ kind: 'fall', year: entry.year }} />
      {[...departments].map(([code, department]) => (
        <p key={code} className="flex flex-wrap gap-x-4 text-sm">
          <Link className="underline" to="/departments/$code" params={{ code }}>
            {department} ({code})
          </Link>
          <Link
            className="underline"
            to="/salaries"
            search={{ dept: code, year: entry.year }}
          >
            Salary distribution, {department}, Fall {entry.year}
          </Link>
        </p>
      ))}
      {positionsOf(entry.records).map(({ position, label }) => (
        <p key={position} className="text-sm">
          <Link
            className="underline"
            to="/salaries"
            search={{ position, year: entry.year }}
          >
            Salary distribution, {label}, Fall {entry.year}
          </Link>
        </p>
      ))}
    </section>
  )
}

/** One name's computed figures, rate chart, records for the selected census, and job history. */
export function PersonView({ person, year }: { person: Person; year: number }) {
  const run = runOf(person, year)
  const entry = run?.years.find((candidate) => candidate.year === year)
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">{person.name}</h2>
      <p className="text-sm text-muted-foreground">{SAME_NAME_NOTE}</p>
      {run && <PersonCards run={run} />}
      <PersonRatesFigure person={person} />
      <YearTabs person={person} year={year} />
      {entry && <YearRecords name={person.name} entry={entry} />}
      <PersonHistoryTable person={person} />
    </section>
  )
}
