import { useState } from 'react'
import { SelectField } from '@/components/fields/select-field'
import { YearRangeFields } from '@/components/fields/year-range-fields'
import type { CodeTrend, ScopeTrends } from '@/data/summary'
import { ALL_OF_UO, type ReportScope } from '@/lib/trends/scope'
import {
  REPORT_METRIC_OPTIONS,
  type ReportMetric,
  type ReportSearch,
  reportMetricSchema,
  type YearRange,
} from '@/lib/trends/search'
import { cn } from '@/lib/utils'

const EVERY = ''

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
          ...areas.map(({ code, name }): [string, string] => [code, name]),
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
            ...units.map(({ code, name }): [string, string] => [code, name]),
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
  scope,
  measure,
  onChange,
}: {
  years: number[]
  range: YearRange
  areas: CodeTrend[]
  scope: ReportScope
  /** `null` on a tab no measure applies to. */
  measure: ReportMetric | null
  onChange: (patch: ReportSearch) => void
}) {
  const [isOpen, setOpen] = useState(false)
  const picked = [scope.area?.name ?? ALL_OF_UO, scope.unit?.name]
    .filter(Boolean)
    .join(' › ')
  return (
    <div className="z-10 rounded-xl border bg-muted p-3 md:sticky md:top-2 md:p-4">
      <FiltersToggle
        isOpen={isOpen}
        summary={`Fall ${range.from}-${range.to} · ${picked}`}
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
          area={scope.area?.code ?? null}
          units={scope.units}
          unit={scope.unit?.code ?? null}
          onChange={onChange}
        />
        {measure && (
          <SelectField
            label="Measure"
            value={measure}
            options={REPORT_METRIC_OPTIONS}
            onSelect={(value) =>
              onChange({ measure: reportMetricSchema.safeParse(value).data })
            }
          />
        )}
      </div>
    </div>
  )
}
