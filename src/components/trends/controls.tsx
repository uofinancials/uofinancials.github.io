import { FilterChips } from '@/components/fields/filter-chips'
import { FilterPanel } from '@/components/fields/filter-panel'
import { SelectField } from '@/components/fields/select-field'
import { YearRangeFields } from '@/components/fields/year-range-fields'
import { staffKindSchema } from '@/data/fall'
import { TREND_GROUPS } from '@/lib/census/groups'
import { filterCountText } from '@/lib/shared/filter-chip'
import {
  ALL_GROUPS,
  GROUP_OPTIONS,
  type PayChangeNames,
  type PayChangesSearch,
  payChangeFilters,
  STAFF_KIND_OPTIONS,
  type TrendView,
} from '@/lib/trends/search'

function LineToggles({
  lines,
  hidden,
  onChange,
}: {
  lines: string[]
  hidden: string[]
  onChange: (search: PayChangesSearch) => void
}) {
  return (
    <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
      <legend className="mb-1 text-muted-foreground">Lines</legend>
      {lines.map((key) => (
        <label key={key} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!hidden.includes(key)}
            onChange={(event) =>
              onChange({
                hide: event.target.checked
                  ? hidden.filter((line) => line !== key)
                  : [...hidden, key],
              })
            }
          />
          {key}
        </label>
      ))}
    </fieldset>
  )
}

/** The pay changes page's filters in a panel, a chip for each one on, including the pay department, area, and class or rank a link sets, and the lines drawn; each change is a new URL search. */
export function TrendsControls({
  view,
  years,
  lines,
  names,
  onChange,
}: {
  view: TrendView
  years: number[]
  lines: string[]
  names: PayChangeNames
  onChange: (search: PayChangesSearch) => void
}) {
  const chips = payChangeFilters(view, names)
  return (
    <div className="space-y-4">
      <FilterPanel
        summary={`Fall ${view.from}-${view.to} · ${filterCountText(chips.length)}`}
      >
        <SelectField
          label="Group"
          value={view.group ?? ALL_GROUPS}
          options={GROUP_OPTIONS}
          onSelect={(value) =>
            onChange({
              group: TREND_GROUPS.find((group) => group === value),
              hide: undefined,
            })
          }
        />
        <SelectField
          label="Staff"
          value={view.kind}
          options={STAFF_KIND_OPTIONS}
          onSelect={(value) =>
            onChange({
              kind: staffKindSchema.safeParse(value).data,
            })
          }
        />
        <YearRangeFields
          years={years}
          from={view.from}
          to={view.to}
          onChange={onChange}
        />
      </FilterPanel>
      <FilterChips chips={chips} onChange={onChange} />
      {lines.length > 0 && (
        <LineToggles lines={lines} hidden={view.hide} onChange={onChange} />
      )}
    </div>
  )
}
