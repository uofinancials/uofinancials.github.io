import { RadioField } from '@/components/fields/radio-field'
import { RemovableFilter } from '@/components/fields/removable-filter'
import { SelectField } from '@/components/fields/select-field'
import { staffKindSchema } from '@/data/fall'
import { TREND_GROUPS } from '@/lib/census/groups'
import {
  ALL_GROUPS,
  type CensusMetric,
  GROUP_OPTIONS,
  METRIC_OPTIONS,
  type PayChangesSearch,
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

type FilterNames = {
  dept: string | null
  area: string | null
  position: string | null
}

function JobFilters({
  names,
  onChange,
}: {
  names: FilterNames
  onChange: (search: PayChangesSearch) => void
}) {
  return (
    <>
      {names.dept !== null && (
        <RemovableFilter
          text={`Pay department: ${names.dept}`}
          onRemove={() => onChange({ dept: undefined })}
        />
      )}
      {names.area !== null && (
        <RemovableFilter
          text={`Area: ${names.area}`}
          onRemove={() => onChange({ area: undefined })}
        />
      )}
      {names.position !== null && (
        <RemovableFilter
          text={`Class or rank: ${names.position}`}
          onRemove={() => onChange({ position: undefined })}
        />
      )}
    </>
  )
}

/** The trends view's controls, with the pay department, area, and class or rank filters a link sets; each change is a new URL search. */
export function TrendsControls({
  view,
  metric,
  years,
  lines,
  names,
  onChange,
}: {
  view: TrendView
  /** The census measure, when the view shows one. */
  metric?: { value: CensusMetric; onSelect: (metric: CensusMetric) => void }
  years: number[]
  lines: string[]
  names: FilterNames
  onChange: (search: PayChangesSearch) => void
}) {
  const yearOptions = years.map((year): [string, string] => [
    String(year),
    String(year),
  ])
  return (
    <div className="space-y-4">
      {metric && (
        <RadioField
          legend="Measure"
          name="metric"
          value={metric.value}
          options={METRIC_OPTIONS}
          onSelect={metric.onSelect}
        />
      )}
      <div className="flex flex-wrap gap-4">
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
        <SelectField
          label="From"
          value={String(view.from)}
          options={yearOptions}
          onSelect={(value) => onChange({ from: Number(value) })}
        />
        <SelectField
          label="To"
          value={String(view.to)}
          options={yearOptions}
          onSelect={(value) => onChange({ to: Number(value) })}
        />
      </div>
      <JobFilters names={names} onChange={onChange} />
      {lines.length > 0 && (
        <LineToggles lines={lines} hidden={view.hide} onChange={onChange} />
      )}
    </div>
  )
}
