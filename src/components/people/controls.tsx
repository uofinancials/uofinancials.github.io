import { memo, useId } from 'react'
import { SearchField } from '@/components/fields/search-field'
import {
  CONTROL_CLASS,
  FIELD_CLASS,
  SelectField,
} from '@/components/fields/select-field'
import { type PeopleView, rateRangeDollars } from '@/lib/people/list'
import type { PeopleSearch } from '@/lib/people/search'
import { cn } from '@/lib/utils'

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
    <label className={FIELD_CLASS}>
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        className={cn(CONTROL_CLASS, 'w-36')}
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

const TitleOptions = memo(function TitleOptions({
  id,
  titles,
}: {
  id: string
  titles: string[]
}) {
  return (
    <datalist id={id}>
      {titles.map((title) => (
        <option key={title} value={title} />
      ))}
    </datalist>
  )
})

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
    <SearchField label="Title" value={value} list={listId} onSearch={onSearch}>
      <TitleOptions id={listId} titles={titles} />
    </SearchField>
  )
}

/** The people list's own filters; `onType` changes the search without a history entry. */
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
    <>
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
    </>
  )
}
