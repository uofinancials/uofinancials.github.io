import { staffKindSchema } from '@/data/fall'
import { TREND_GROUPS } from '@/lib/trend-groups'
import {
  METRIC_INFO,
  TREND_METRICS,
  type TrendsSearch,
  type TrendView,
} from '@/lib/trends-search'

const ALL_GROUPS = 'all'
const GROUP_OPTIONS: [string, string][] = [
  [ALL_GROUPS, 'All groups'],
  ...TREND_GROUPS.map((group): [string, string] => [group, group]),
]
const KIND_OPTIONS: [string, string][] = [
  ['all', 'Classified and unclassified'],
  ['classified', 'Classified'],
  ['unclassified', 'Unclassified'],
]

function SelectField({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string
  options: [string, string][]
  onSelect: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="rounded-md border bg-background px-2 py-1"
        value={value}
        onChange={(event) => onSelect(event.target.value)}
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

function LineToggles({
  lines,
  hidden,
  onChange,
}: {
  lines: string[]
  hidden: string[]
  onChange: (search: TrendsSearch) => void
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

/** The trends view's controls; each change is a new URL search. */
export function TrendsControls({
  view,
  years,
  lines,
  onChange,
}: {
  view: TrendView
  years: number[]
  lines: string[]
  onChange: (search: TrendsSearch) => void
}) {
  const yearOptions = years.map((year): [string, string] => [
    String(year),
    String(year),
  ])
  return (
    <div className="space-y-4">
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-1 text-muted-foreground">Measure</legend>
        {TREND_METRICS.map((metric) => (
          <label key={metric} className="flex items-center gap-2">
            <input
              type="radio"
              name="metric"
              checked={view.metric === metric}
              onChange={() => onChange({ metric })}
            />
            {METRIC_INFO[metric].label}
          </label>
        ))}
      </fieldset>
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
          options={KIND_OPTIONS}
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
      <LineToggles lines={lines} hidden={view.hide} onChange={onChange} />
    </div>
  )
}
