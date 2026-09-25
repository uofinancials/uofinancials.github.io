import { Link } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FallRecord } from '@/data/fall'
import { NO_VALUE } from '@/lib/format'
import { type PeopleView, recordKey } from '@/lib/people-list'
import type { PeopleSort, SortDirection } from '@/lib/people-search'
import { LIST_FIELDS } from '@/lib/person-fields'
import { cn } from '@/lib/utils'

const ARIA_SORT: Record<SortDirection, 'ascending' | 'descending'> = {
  asc: 'ascending',
  desc: 'descending',
}

function SortHeader({
  label,
  sort,
  isNumber = false,
  view,
  onSort,
}: {
  label: string
  sort: PeopleSort | null
  isNumber?: boolean
  view: PeopleView
  onSort: (sort: PeopleSort, dir: SortDirection) => void
}) {
  const isSorted = sort !== null && sort === view.sort
  return (
    <TableHead
      scope="col"
      aria-sort={isSorted ? ARIA_SORT[view.dir] : undefined}
      className={cn(isNumber && 'text-right')}
    >
      {sort === null ? (
        label
      ) : (
        <button
          type="button"
          className="underline decoration-dotted"
          onClick={() =>
            onSort(sort, isSorted && view.dir === 'asc' ? 'desc' : 'asc')
          }
        >
          {label}
          {isSorted && (view.dir === 'asc' ? ' ▲' : ' ▼')}
        </button>
      )}
    </TableHead>
  )
}

/** One page of jobs, a row each, named and linked to the person, in the view's columns; each sortable header sorts by its column. */
export function PeopleTable({
  rows,
  view,
  onSort,
}: {
  rows: FallRecord[]
  view: PeopleView
  onSort: (sort: PeopleSort, dir: SortDirection) => void
}) {
  const fields = LIST_FIELDS.filter(({ column }) =>
    view.columns.includes(column),
  )
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHeader label="Name" sort="name" view={view} onSort={onSort} />
          {fields.map(({ label, sort, isNumber }) => (
            <SortHeader
              key={label}
              label={label}
              sort={sort}
              isNumber={isNumber}
              view={view}
              onSort={onSort}
            />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((record) => (
          <TableRow key={recordKey(record)}>
            <TableHead
              scope="row"
              className="min-w-36 font-normal whitespace-normal"
            >
              <Link
                className="underline"
                to="/people/$name"
                params={{ name: record.name }}
                search={{ year: view.year }}
              >
                {record.name}
              </Link>
            </TableHead>
            {fields.map(({ label, value, isNumber }) => (
              <TableCell
                key={label}
                className={
                  isNumber
                    ? 'text-right tabular-nums'
                    : 'min-w-28 whitespace-normal'
                }
              >
                {value(record) ?? NO_VALUE}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
