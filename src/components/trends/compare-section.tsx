import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { SeriesChart } from '@/components/charts/series-chart'
import { RadioField } from '@/components/fields/radio-field'
import { SelectField } from '@/components/fields/select-field'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { areaTrendsQuery } from '@/data/queries'
import { SPEND_METHOD } from '@/lib/census/totals'
import { AREA_PLACEMENT_METHOD } from '@/lib/departments/jobs'
import {
  formatChange,
  formatCount,
  formatIndex,
  formatOrBlank,
} from '@/lib/shared/format'
import type { CodeTrend } from '@/lib/trends/area-trends'
import {
  ALL_OF_UO,
  type CompareLine,
  type CompareRow,
  compareAnswer,
  compareLines,
  compareRows,
} from '@/lib/trends/compare'
import { unindexedNote } from '@/lib/trends/report-text'
import {
  METRIC_INFO,
  REPORT_METRICS,
  type ReportMetric,
  type TrendsSearch,
} from '@/lib/trends/search'
import type { TrendPoint } from '@/lib/trends/trends'
import { cn, NUMBER_CELL } from '@/lib/utils'

const EVERY = ''

const METRIC_OPTIONS = REPORT_METRICS.map(
  (metric) => [metric, METRIC_INFO[metric].label] as const,
)

type Range = { from: number; to: number }

function CompareTable({
  rows,
  totals,
  caption,
  selected,
}: {
  rows: CompareRow[]
  totals: CompareRow[]
  caption: string
  selected: string | null
}) {
  const row = (entry: CompareRow, isTotal: boolean) => (
    <TableRow
      key={`${entry.code} ${entry.name}`}
      className={cn(entry.code === selected && 'bg-muted')}
    >
      <TableHead scope="row" className={isTotal ? '' : 'font-normal'}>
        {isTotal ? (
          entry.name
        ) : (
          <Link
            className="link"
            to="/departments/$code"
            params={{ code: entry.code }}
          >
            {entry.name}
          </Link>
        )}
      </TableHead>
      <TableCell className={NUMBER_CELL}>{formatCount(entry.jobs)}</TableCell>
      <TableCell className={NUMBER_CELL}>
        {formatOrBlank(entry.fte, formatChange)}
      </TableCell>
      <TableCell className={NUMBER_CELL}>
        {formatOrBlank(entry.spend, formatChange)}
      </TableCell>
    </TableRow>
  )
  return (
    <div className="max-h-[32rem] overflow-y-auto">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col" className="text-right">
              Jobs, last census
            </TableHead>
            <TableHead scope="col" className="text-right">
              FTE
            </TableHead>
            <TableHead scope="col" className="text-right">
              Salary spend
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {totals.map((entry) => row(entry, true))}
          {rows.map((entry) => row(entry, false))}
        </TableBody>
      </Table>
    </div>
  )
}

function CompareChart({
  lines,
  metric,
  range,
}: {
  lines: CompareLine[]
  metric: ReportMetric
  range: Range
}) {
  const indexed = compareLines(lines, metric, range)
  const labels = lines
    .at(-1)
    ?.points.filter(({ year }) => year >= range.from && year <= range.to)
    .map(({ year }) => String(year))
  const note = unindexedNote(indexed.unindexed, metric, range.from)
  return (
    <>
      <p>{compareAnswer(lines, metric, range)}</p>
      <SeriesChart
        labels={labels ?? []}
        series={indexed.lines}
        format={formatIndex}
        formatAxis={formatIndex}
        label={`${METRIC_INFO[metric].label}, Fall ${range.from} = 100`}
        hasEndLabels
        isZeroBased={false}
        className="h-80"
      />
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </>
  )
}

function AreaCompare({
  area,
  unit,
  all,
  metric,
  range,
  onChange,
}: {
  area: CodeTrend
  unit: string | null
  all: CompareLine
  metric: ReportMetric
  range: Range
  onChange: (patch: TrendsSearch) => void
}) {
  const { data } = useSuspenseQuery(areaTrendsQuery(area.code))
  const units = [...data.units].sort((a, b) => a.name.localeCompare(b.name))
  const picked = units.find(({ code }) => code === unit) ?? null
  const areaLine = { key: area.name, points: area.points }
  const lines = picked
    ? [{ key: picked.name, points: picked.points }, areaLine, all]
    : [areaLine, all]
  return (
    <>
      <SelectField
        label="Unit"
        value={picked?.code ?? EVERY}
        options={[
          [EVERY, 'The whole area'],
          ...units.map(({ code, name }): [string, string] => [code, name]),
        ]}
        onSelect={(value) => onChange({ unit: value || undefined })}
      />
      <CompareChart lines={lines} metric={metric} range={range} />
      <CompareTable
        rows={compareRows(data.units, range)}
        totals={compareRows(
          [area, { code: '', name: ALL_OF_UO, points: all.points }],
          range,
        )}
        caption={`Units in ${area.name}, Fall ${range.from} to Fall ${range.to}`}
        selected={picked?.code ?? null}
      />
    </>
  )
}

/** One unit against its college or VP area and the university, and the area's units, or every area when none is picked. */
export function CompareSection({
  areas,
  total,
  area,
  unit,
  metric,
  range,
  fiscalYears,
  onChange,
}: {
  areas: CodeTrend[]
  total: TrendPoint[]
  area: string | null
  unit: string | null
  metric: ReportMetric
  range: Range
  fiscalYears: Range
  onChange: (patch: TrendsSearch) => void
}) {
  const picked = areas.find(({ code }) => code === area) ?? null
  const all = { key: ALL_OF_UO, points: total }
  const byName = [...areas].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <PageSection id="compare" title="How does my unit compare?">
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
          options={METRIC_OPTIONS}
          onSelect={(value) => onChange({ compare: value })}
        />
      </div>
      {picked ? (
        <AreaCompare
          area={picked}
          unit={unit}
          all={all}
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
            rows={compareRows(areas, range)}
            totals={compareRows(
              [{ code: '', name: ALL_OF_UO, points: total }],
              range,
            )}
            caption={`Colleges and VP areas, Fall ${range.from} to Fall ${range.to}`}
            selected={null}
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
    </PageSection>
  )
}
