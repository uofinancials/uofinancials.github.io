import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { IndexFigure } from '@/components/charts/index-figure'
import { RadioField } from '@/components/fields/radio-field'
import { SelectField } from '@/components/fields/select-field'
import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { Sources } from '@/components/layout/sources'
import { areaTrendsQuery } from '@/data/queries'
import type { CodeTrend } from '@/data/summary'
import { SPEND_METHOD } from '@/lib/census/totals'
import { AREA_PLACEMENT_METHOD } from '@/lib/departments/jobs'
import { formatChange, formatCount, formatOrBlank } from '@/lib/shared/format'
import {
  type CompareRow,
  compareAnswer,
  compareLines,
  compareRows,
  inRange,
  lineChanges,
} from '@/lib/trends/compare'
import { unindexedNote } from '@/lib/trends/report-text'
import {
  METRIC_INFO,
  REPORT_METRIC_OPTIONS,
  type ReportMetric,
  type ReportSearch,
  type YearRange,
} from '@/lib/trends/search'
import { type GroupRow, GroupTable } from './group-table'

const EVERY = ''

function compareRow(
  { code, name, jobs, fte, spend }: CompareRow,
  { isTotal, selected }: { isTotal: boolean; selected: string | null },
): GroupRow {
  return {
    key: `${code} ${name}`,
    label: isTotal ? (
      name
    ) : (
      <Link className="link" to="/departments/$code" params={{ code }}>
        {name}
      </Link>
    ),
    isTotal,
    isHighlighted: code === selected,
    cells: [
      { value: formatCount(jobs) },
      { value: formatOrBlank(fte, formatChange) },
      { value: formatOrBlank(spend, formatChange) },
    ],
  }
}

function CompareTable({
  codes,
  totals,
  caption,
  selected = null,
}: {
  codes: CodeTrend[]
  totals: CodeTrend[]
  caption: string
  selected?: string | null
}) {
  return (
    <div className="max-h-[32rem] overflow-y-auto">
      <GroupTable
        caption={caption}
        heading="Name"
        columns={['Jobs, last census', 'FTE', 'Salary spend']}
        rows={[
          ...compareRows(totals).map((row) =>
            compareRow(row, { isTotal: true, selected }),
          ),
          ...compareRows(codes).map((row) =>
            compareRow(row, { isTotal: false, selected }),
          ),
        ]}
      />
    </div>
  )
}

function CompareFigure({
  codes,
  metric,
  range,
}: {
  codes: CodeTrend[]
  metric: ReportMetric
  range: YearRange
}) {
  const { labels, lines, unindexed } = compareLines(codes, metric)
  const note = unindexedNote(unindexed, metric, range.from)
  return (
    <>
      <p>{compareAnswer(codes, metric, range.from)}</p>
      <IndexFigure
        view="chart"
        labels={labels}
        lines={lines}
        changes={lineChanges(codes, metric)}
        emphasis={codes.at(-1)?.name}
        label={`${METRIC_INFO[metric].label}, Fall ${range.from} = 100`}
        barsLabel={`Change in ${METRIC_INFO[metric].noun}, Fall ${range.from} to Fall ${range.to}`}
      />
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </>
  )
}

function AreaCompare({
  area,
  unit,
  university,
  metric,
  range,
  onChange,
}: {
  area: CodeTrend
  unit: string | null
  university: CodeTrend
  metric: ReportMetric
  range: YearRange
  onChange: (patch: ReportSearch) => void
}) {
  const { data } = useSuspenseQuery(areaTrendsQuery(area.code))
  const units = inRange(data.units, range)
  const picked = units.find(({ code }) => code === unit) ?? null
  const byName = [...units].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <>
      <SelectField
        label="Unit"
        value={picked?.code ?? EVERY}
        options={[
          [EVERY, 'The whole area'],
          ...byName.map(({ code, name }): [string, string] => [code, name]),
        ]}
        onSelect={(value) => onChange({ unit: value || undefined })}
      />
      <CompareFigure
        codes={picked ? [picked, area, university] : [area, university]}
        metric={metric}
        range={range}
      />
      <CompareTable
        codes={units}
        totals={[area, university]}
        caption={`Units in ${area.name}, Fall ${range.from} to Fall ${range.to}`}
        selected={picked?.code}
      />
    </>
  )
}

/** One unit against its college or VP area and the university, and the area's units, or every area when none is picked; the codes are given over every census and shown over the range. */
export function CompareSection({
  areas,
  university,
  area,
  unit,
  metric,
  range,
  fiscalYears,
  onChange,
}: {
  areas: CodeTrend[]
  university: CodeTrend
  area: string | null
  unit: string | null
  metric: ReportMetric
  range: YearRange
  fiscalYears: YearRange
  onChange: (patch: ReportSearch) => void
}) {
  const shown = inRange([university, ...areas], range)
  const [all = university, ...shownAreas] = shown
  const picked = shownAreas.find(({ code }) => code === area) ?? null
  const byName = [...shownAreas].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <CollapsibleSection
      id="compare"
      title="How does my unit compare?"
      isOpen={picked !== null}
    >
      <div className="flex flex-wrap items-end gap-4">
        <SelectField
          label="College or VP area"
          value={picked?.code ?? EVERY}
          options={[
            [EVERY, 'Every area'],
            ...byName.map(({ code, name }): [string, string] => [code, name]),
          ]}
          onSelect={(value) =>
            onChange({ area: value || undefined, unit: undefined })
          }
        />
        <RadioField
          legend="Measure"
          name="compare"
          value={metric}
          options={REPORT_METRIC_OPTIONS}
          onSelect={(value) => onChange({ compare: value })}
        />
      </div>
      {picked ? (
        <AreaCompare
          area={picked}
          unit={unit}
          university={all}
          metric={metric}
          range={range}
          onChange={onChange}
        />
      ) : (
        <>
          <p>
            Choose a college or VP area to chart it, or one of its units,
            against the university.
          </p>
          <CompareTable
            codes={shownAreas}
            totals={[all]}
            caption={`Colleges and VP areas, Fall ${range.from} to Fall ${range.to}`}
          />
        </>
      )}
      <Sources
        sources={[
          {
            kind: 'fall-range',
            ...range,
            computed: `${SPEND_METHOD} Each line is its figure in each census over its figure in Fall ${range.from}, times 100; changes are the last census’s figure over the first’s, less one. A unit’s jobs are those paid under its code, so a unit that took over another’s jobs shows it as growth.`,
          },
          {
            kind: 'budget-range',
            ...fiscalYears,
            computed: AREA_PLACEMENT_METHOD,
          },
        ]}
      />
    </CollapsibleSection>
  )
}
