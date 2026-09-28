import { useState } from 'react'
import { SelectField } from '@/components/fields/select-field'
import { YearRangeFields } from '@/components/fields/year-range-fields'
import type { CodeTrend, ScopeTrends } from '@/data/summary'
import { ALL_OF_UO } from '@/lib/trends/compare'
import {
  REPORT_METRIC_OPTIONS,
  type ReportMetric,
  type ReportSearch,
  reportMetricSchema,
  type YearRange,
} from '@/lib/trends/search'
import { cn } from '@/lib/utils'

const EVERY = ''

const MEASURE_OPTIONS = REPORT_METRIC_OPTIONS.map(
  ([value, text]): [string, string] => [value, text],
)

function byName<T extends { name: string }>(codes: T[]): T[] {
  return [...codes].sort((a, b) => a.name.localeCompare(b.name))
}

function FiltersToggle({
  isOpen,
  summary,
  onToggle,
}: {
  isOpen: boolean
  summary: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 text-left text-sm md:hidden"
    >
      <span>{summary}</span>
      <span className="text-muted-foreground">
        {isOpen ? 'Close' : 'Filters'}
      </span>
    </button>
  )
}

function ScopeFields({
  areas,
  area,
  units,
  unit,
  onChange,
}: {
  areas: CodeTrend[]
  area: string | null
  units: ScopeTrends[]
  unit: string | null
  onChange: (patch: ReportSearch) => void
}) {
  return (
    <>
      <SelectField
        label="College or VP area"
        value={area ?? EVERY}
        options={[
          [EVERY, ALL_OF_UO],
          ...byName(areas).map(({ code, name }): [string, string] => [
            code,
            name,
          ]),
        ]}
        onSelect={(value) =>
          onChange({ area: value || undefined, unit: undefined })
        }
      />
      {units.length > 0 && (
        <SelectField
          label="Unit"
          value={unit ?? EVERY}
          options={[
            [EVERY, 'The whole area'],
            ...byName(units).map(({ code, name }): [string, string] => [
              code,
              name,
            ]),
          ]}
          onSelect={(value) => onChange({ unit: value || undefined })}
        />
      )}
    </>
  )
}

/** The report's filters in one card, kept in view as the page scrolls on a wide screen and folded behind a button on a phone; Measure shows only where a tab uses it. */
export function ReportFilters({
  years,
  range,
  areas,
  area,
  units,
  unit,
  measure,
  onChange,
}: {
  years: number[]
  range: YearRange
  areas: CodeTrend[]
  area: string | null
  /** The picked area's units, empty without one. */
  units: ScopeTrends[]
  unit: string | null
  /** `null` on a tab no measure applies to. */
  measure: ReportMetric | null
  onChange: (patch: ReportSearch) => void
}) {
  const [isOpen, setOpen] = useState(false)
  const areaName = areas.find(({ code }) => code === area)?.name
  const unitName = units.find(({ code }) => code === unit)?.name
  const scope = [areaName ?? ALL_OF_UO, unitName].filter(Boolean).join(' › ')
  return (
    <div className="z-10 rounded-xl border bg-muted p-3 md:sticky md:top-2 md:p-4">
      <FiltersToggle
        isOpen={isOpen}
        summary={`Fall ${range.from}-${range.to} · ${scope}`}
        onToggle={() => setOpen(!isOpen)}
      />
      <div
        className={cn(
          'mt-3 flex-wrap items-end gap-4 md:mt-0 md:flex',
          isOpen ? 'flex' : 'hidden',
        )}
      >
        <YearRangeFields
          years={years}
          from={range.from}
          to={range.to}
          onChange={onChange}
        />
        <ScopeFields
          areas={areas}
          area={area}
          units={units}
          unit={unit}
          onChange={onChange}
        />
        {measure && (
          <SelectField
            label="Measure"
            value={measure}
            options={MEASURE_OPTIONS}
            onSelect={(value) =>
              onChange({ measure: reportMetricSchema.safeParse(value).data })
            }
          />
        )}
      </div>
    </div>
  )
}
