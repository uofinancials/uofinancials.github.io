import { Link } from '@tanstack/react-router'
import { SortHeader } from '@/components/sort-header'
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
import type { PeopleSort } from '@/lib/people-search'
import { LIST_FIELDS } from '@/lib/person-fields'
import type { SortDirection } from '@/lib/sort'
import { NUMBER_CELL } from '@/lib/utils'

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
                  isNumber ? NUMBER_CELL : 'min-w-28 whitespace-normal'
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
