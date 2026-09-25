import { useId } from 'react'
import { RemovableFilter } from '@/components/removable-filter'
import { SearchField } from '@/components/search-field'
import { SelectField } from '@/components/select-field'
import {
  type PeopleView,
  rateRangeDollars,
  typedFilters,
} from '@/lib/people-list'
import type { PeopleSearch } from '@/lib/people-search'

const ALL = 'all'

function DollarField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
}) {
  return (
    <label className="flex w-36 flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        className="rounded-md border bg-background px-2 py-1"
        value={value ?? ''}
        onChange={(event) => {
          const dollars = Math.round(event.target.valueAsNumber)
          onChange(
            Number.isFinite(dollars) && dollars >= 0 ? dollars : undefined,
          )
        }}
      />
    </label>
  )
}

function TitleField({
  value,
  titles,
  onSearch,
}: {
  value: string
  titles: string[]
  onSearch: (value: string | undefined) => void
}) {
  const listId = useId()
  return (
    <label className="flex max-w-sm flex-col gap-1 text-sm">
      <span className="text-muted-foreground">Title</span>
      <input
        type="search"
        list={listId}
        className="rounded-md border bg-background px-2 py-1"
        value={value}
        onChange={(event) => onSearch(event.target.value || undefined)}
      />
      <datalist id={listId}>
        {titles.map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>
    </label>
  )
}

/** The people list's own filters, and a chip for each typed one; `onType` changes the search without a history entry. */
export function PeopleControls({
  view,
  titles,
  categories,
  onChange,
  onType,
}: {
  view: PeopleView
  titles: string[]
  categories: string[]
  onChange: (search: PeopleSearch) => void
  onType: (search: PeopleSearch) => void
}) {
  const range = rateRangeDollars(view)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <SearchField
          label="Name"
          value={view.q}
          onSearch={(q) => onType({ q })}
        />
        <TitleField
          value={view.title}
          titles={titles}
          onSearch={(title) => onType({ title })}
        />
        <SelectField
          label="EEO category"
          value={view.category ?? ALL}
          options={[
            [ALL, 'All categories'],
            ...categories.map((category): [string, string] => [
              category,
              category,
            ]),
          ]}
          onSelect={(value) =>
            onChange({ category: value === ALL ? undefined : value })
          }
        />
        <DollarField
          label="Rate from ($)"
          value={range.min}
          onChange={(min) => onType({ min })}
        />
        <DollarField
          label="Rate to ($)"
          value={range.max}
          onChange={(max) => onType({ max })}
        />
      </div>
      {typedFilters(view).map(({ text, clear }) => (
        <RemovableFilter
          key={text}
          text={text}
          onRemove={() => onChange(clear)}
        />
      ))}
    </div>
  )
}
