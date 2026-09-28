import { useState } from 'react'
import { OptionSearch } from '@/components/fields/option-search'
import { RadioField } from '@/components/fields/radio-field'
import { YearRangeFields } from '@/components/fields/year-range-fields'
import type { SummaryArea } from '@/data/summary'
import type { CompareOption } from '@/lib/trends/compare'
import { ALL_OF_UO, type ReportScope, scopeSearchOf } from '@/lib/trends/scope'
import {
  REPORT_METRIC_OPTIONS,
  type ReportMetric,
  type ReportSearch,
  type YearRange,
} from '@/lib/trends/search'
import { cn } from '@/lib/utils'

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

/** The report's filters in one card, kept in view as the page scrolls on a wide screen and folded behind a button on a phone; Measure shows only where a tab uses it. */
export function ReportFilters({
  years,
  range,
  areas,
  options,
  scope,
  measure,
  onChange,
}: {
  years: number[]
  range: YearRange
  areas: SummaryArea[]
  /** Every area and unit, the choices of the scope search. */
  options: CompareOption[]
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
        <OptionSearch
          label="College, VP area, or unit"
          options={options}
          selected={
            options.find(
              ({ code }) => code === (scope.unit ?? scope.area)?.code,
            ) ?? null
          }
          placeholder={ALL_OF_UO}
          onAdd={(code) => onChange(scopeSearchOf(areas, code))}
          onClear={() => onChange({ area: undefined, unit: undefined })}
        />
        {measure && (
          <RadioField
            legend="Measure"
            name="measure"
            value={measure}
            options={REPORT_METRIC_OPTIONS}
            isSegmented
            onSelect={(value) => onChange({ measure: value })}
          />
        )}
      </div>
    </div>
  )
}
