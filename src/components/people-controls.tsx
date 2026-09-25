import { useId } from 'react'
import { RemovableFilter } from '@/components/removable-filter'
import { SalariesControls } from '@/components/salaries-controls'
import { SearchField } from '@/components/search-field'
import { SelectField } from '@/components/select-field'
import { formatDollars } from '@/lib/format'
import type { PeopleView } from '@/lib/people-list'
import type { PeopleSearch } from '@/lib/people-search'
import type { Place } from '@/lib/salaries-search'

const ALL = 'all'
const CENTS_PER_DOLLAR = 100

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

function dollarsOf(cents: number | null): number | undefined {
  return cents === null ? undefined : cents / CENTS_PER_DOLLAR
}

/** The whole-dollar maximum a view's exclusive ceiling stands for. */
function maxDollarsOf({ ceilingCents }: PeopleView): number | undefined {
  return ceilingCents === null ? undefined : ceilingCents / CENTS_PER_DOLLAR - 1
}

function chipsOf(view: PeopleView): { text: string; clear: PeopleSearch }[] {
  const chips: { text: string; clear: PeopleSearch }[] = []
  const max = maxDollarsOf(view)
  if (view.q) chips.push({ text: `Name: ${view.q}`, clear: { q: undefined } })
  if (view.title) {
    chips.push({ text: `Title: ${view.title}`, clear: { title: undefined } })
  }
  if (view.category) {
    chips.push({
      text: `EEO category: ${view.category}`,
      clear: { category: undefined },
    })
  }
  if (view.minCents !== null) {
    chips.push({
      text: `Rate from ${formatDollars(view.minCents)}`,
      clear: { min: undefined },
    })
  }
  if (max !== undefined) {
    chips.push({
      text: `Rate to ${formatDollars(max * CENTS_PER_DOLLAR)}`,
      clear: { max: undefined },
    })
  }
  return chips
}

/** The people list's filters, and a chip for each typed one; `onType` changes the search without a history entry. */
export function PeopleControls({
  view,
  years,
  areas,
  place,
  positionName,
  titles,
  categories,
  onChange,
  onType,
}: {
  view: PeopleView
  years: number[]
  areas: { code: string; name: string }[]
  place: Place
  positionName: string | null
  titles: string[]
  categories: string[]
  onChange: (search: PeopleSearch) => void
  onType: (search: PeopleSearch) => void
}) {
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
          value={dollarsOf(view.minCents)}
          onChange={(min) => onType({ min })}
        />
        <DollarField
          label="Rate to ($)"
          value={maxDollarsOf(view)}
          onChange={(max) => onType({ max })}
        />
      </div>
      <SalariesControls
        view={view}
        years={years}
        areas={areas}
        place={place}
        positionName={positionName}
        onChange={onChange}
      />
      {chipsOf(view).map(({ text, clear }) => (
        <RemovableFilter
          key={text}
          text={text}
          onRemove={() => onChange(clear)}
        />
      ))}
    </div>
  )
}
