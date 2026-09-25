import { SelectField } from '@/components/select-field'
import type { PeopleView } from '@/lib/people-list'
import {
  PEOPLE_SORTS,
  type PeopleSort,
  SORT_LABELS,
  type SortDirection,
} from '@/lib/people-search'

const SORT_OPTIONS = PEOPLE_SORTS.map((sort): [string, string] => [
  sort,
  SORT_LABELS[sort],
])
const DIRECTION_OPTIONS: [SortDirection, string][] = [
  ['asc', 'Ascending'],
  ['desc', 'Descending'],
]

/** Every sort, including those with no column of their own. */
export function SortControls({
  view,
  onSort,
}: {
  view: PeopleView
  onSort: (sort: PeopleSort, dir: SortDirection) => void
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <SelectField
        label="Sort by"
        value={view.sort}
        options={SORT_OPTIONS}
        onSelect={(value) =>
          onSort(
            PEOPLE_SORTS.find((sort) => sort === value) ?? 'name',
            view.dir,
          )
        }
      />
      <SelectField
        label="Order"
        value={view.dir}
        options={DIRECTION_OPTIONS}
        onSelect={(value) =>
          onSort(view.sort, value === 'desc' ? 'desc' : 'asc')
        }
      />
    </div>
  )
}
