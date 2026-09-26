import { TableHead } from '@/components/ui/table'
import type { SortDirection } from '@/lib/sort'
import { cn } from '@/lib/utils'

const ARIA_SORT: Record<SortDirection, 'ascending' | 'descending'> = {
  asc: 'ascending',
  desc: 'descending',
}

/** A column header that sorts by its column, ascending first, then flips; plain text when `sort` is `null`. */
export function SortHeader<S extends string>({
  label,
  sort,
  isNumber = false,
  view,
  onSort,
}: {
  label: string
  sort: S | null
  isNumber?: boolean
  view: { sort: S; dir: SortDirection }
  onSort: (sort: S, dir: SortDirection) => void
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
