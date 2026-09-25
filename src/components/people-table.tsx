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
import { type PeopleView, recordKey } from '@/lib/people-list'
import type { PeopleSort, SortDirection } from '@/lib/people-search'
import { LIST_COLUMNS, listValues } from '@/lib/person-fields'
import { cn } from '@/lib/utils'

const NUMBER_COLUMNS = new Set<PeopleSort | null>(['appt', 'rate'])
const ARIA_SORT: Record<SortDirection, 'ascending' | 'descending'> = {
  asc: 'ascending',
  desc: 'descending',
}

function SortHeader({
  label,
  sort,
  view,
  onSort,
}: {
  label: string
  sort: PeopleSort | null
  view: PeopleView
  onSort: (sort: PeopleSort, dir: SortDirection) => void
}) {
  const isSorted = sort !== null && sort === view.sort
  return (
    <TableHead
      scope="col"
      aria-sort={isSorted ? ARIA_SORT[view.dir] : undefined}
      className={cn(NUMBER_COLUMNS.has(sort) && 'text-right')}
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

/** One page of jobs, a row each, named and linked to the person; each sortable header sorts by its column. */
export function PeopleTable({
  rows,
  view,
  onSort,
}: {
  rows: FallRecord[]
  view: PeopleView
  onSort: (sort: PeopleSort, dir: SortDirection) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHeader label="Name" sort="name" view={view} onSort={onSort} />
          {LIST_COLUMNS.map(({ label, sort }) => (
            <SortHeader
              key={label}
              label={label}
              sort={sort}
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
            {listValues(record).map((value, index) => (
              <TableCell
                key={LIST_COLUMNS[index]?.label}
                className={
                  NUMBER_COLUMNS.has(LIST_COLUMNS[index]?.sort ?? null)
                    ? 'text-right tabular-nums'
                    : 'min-w-28 whitespace-normal'
                }
              >
                {value}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
