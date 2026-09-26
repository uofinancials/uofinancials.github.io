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
import type { TableSort } from '@/lib/department-search'
import type { DepartmentRow, DepartmentSort } from '@/lib/department-table'
import {
  formatChange,
  formatCount,
  formatDollars,
  formatOrBlank,
} from '@/lib/format'
import type { SortDirection } from '@/lib/sort'
import { NUMBER_CELL } from '@/lib/utils'

const FIGURES: {
  label: string
  sort: DepartmentSort
  value: (row: DepartmentRow) => string
}[] = [
  {
    label: 'Budget',
    sort: 'budget',
    value: (row) => formatOrBlank(row.budgetCents, formatDollars),
  },
  {
    label: 'Budget change',
    sort: 'budgetChange',
    value: (row) => formatOrBlank(row.changes.budget, formatChange),
  },
  { label: 'Jobs', sort: 'jobs', value: (row) => formatCount(row.jobs) },
  {
    label: 'Jobs change',
    sort: 'jobsChange',
    value: (row) => formatOrBlank(row.changes.jobs, formatChange),
  },
  {
    label: 'Salary spend',
    sort: 'spend',
    value: (row) => formatOrBlank(row.spendCents, formatDollars),
  },
  {
    label: 'Spend change',
    sort: 'spendChange',
    value: (row) => formatOrBlank(row.changes.spend, formatChange),
  },
  {
    label: 'Median salary rate',
    sort: 'median',
    value: (row) => formatOrBlank(row.medianRateCents, formatDollars),
  },
  {
    label: 'Median change',
    sort: 'medianChange',
    value: (row) => formatOrBlank(row.changes.median, formatChange),
  },
]

function CodeLink({ code, name }: { code: string | null; name: string }) {
  return code === null ? (
    name
  ) : (
    <Link className="underline" to="/departments/$code" params={{ code }}>
      {name}
    </Link>
  )
}

/** Department rows in the order given, each linked to its page, under headers that sort them. */
export function DepartmentTable({
  caption,
  rows,
  showArea,
  view,
  onSort,
}: {
  caption: string
  rows: DepartmentRow[]
  showArea: boolean
  view: TableSort
  onSort: (sort: DepartmentSort, dir: SortDirection) => void
}) {
  return (
    <Table>
      <caption className="mb-2 caption-top text-left font-medium">
        {caption}
      </caption>
      <TableHeader>
        <TableRow>
          <SortHeader label="Name" sort="name" view={view} onSort={onSort} />
          {showArea && (
            <SortHeader label="Area" sort="area" view={view} onSort={onSort} />
          )}
          {FIGURES.map(({ label, sort }) => (
            <SortHeader
              key={sort}
              label={label}
              sort={sort}
              isNumber
              view={view}
              onSort={onSort}
            />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.code ?? 'unassigned'}>
            <TableHead
              scope="row"
              className="min-w-40 font-normal whitespace-normal"
            >
              <CodeLink code={row.code} name={row.name} />{' '}
              <span className="text-muted-foreground">{row.code}</span>
            </TableHead>
            {showArea && (
              <TableCell className="min-w-32 whitespace-normal">
                {row.area && <CodeLink {...row.area} />}
              </TableCell>
            )}
            {FIGURES.map(({ sort, value }) => (
              <TableCell key={sort} className={NUMBER_CELL}>
                {value(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
