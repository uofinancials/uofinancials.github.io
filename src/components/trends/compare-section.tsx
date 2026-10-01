import { Link } from '@tanstack/react-router'
import { IndexFigure } from '@/components/charts/index-figure'
import { Chip } from '@/components/fields/chip'
import { OptionSearch } from '@/components/fields/option-search'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import type { CodeTrend } from '@/data/summary'
import { SPEND_METHOD } from '@/lib/census/totals'
import type { SectionSource } from '@/lib/shared/citation'
import { formatChange, formatCount, formatOrBlank } from '@/lib/shared/format'
import {
  type CompareOption,
  type CompareRow,
  compareAnswer,
  compareLines,
  compareRows,
  inRange,
  lineChanges,
  totalsOf,
} from '@/lib/trends/compare'
import { unindexedNote } from '@/lib/trends/report-text'
import type { ReportScope } from '@/lib/trends/scope'
import {
  MAX_COMPARED,
  METRIC_INFO,
  type ReportMetric,
  type ReportSearch,
  type YearRange,
} from '@/lib/trends/search'
import { fySource } from '@/lib/trends/trends'
import { type GroupRow, GroupTable } from './group-table'

function compareRow(
  { code, name, jobs, fte, spend }: CompareRow,
  { isTotal, selected }: { isTotal: boolean; selected: string | null },
): GroupRow {
  return {
    key: `${isTotal ? 'total' : 'row'} ${code} ${name}`,
    label: !code ? (
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
    <GroupTable
      caption={caption}
      heading="Name"
      columns={['Jobs, last census', 'FTE change', 'Salary spend change']}
      rows={[
        ...compareRows(totals).map((row) =>
          compareRow(row, { isTotal: true, selected }),
        ),
        ...compareRows(codes)
          .filter(({ code }) => !totals.some((total) => total.code === code))
          .map((row) => compareRow(row, { isTotal: false, selected })),
      ]}
      containerClassName="max-h-[32rem]"
    />
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

function CompareWith({
  options,
  pick,
  compared,
  onChange,
}: {
  options: CompareOption[]
  pick: CodeTrend | undefined
  compared: CodeTrend[]
  onChange: (patch: ReportSearch) => void
}) {
  const codes = compared.map(({ code }) => code)
  return (
    <div className="flex flex-wrap items-end gap-3">
      {compared.map(({ code, name }) => (
        <Chip
          key={code}
          text={name}
          onRemove={() =>
            onChange({ with: codes.filter((listed) => listed !== code) })
          }
        />
      ))}
      {codes.length < MAX_COMPARED ? (
        <OptionSearch
          label="Compare with"
          options={options}
          chosen={pick ? [pick.code, ...codes] : codes}
          onAdd={(code) => onChange({ with: [...codes, code] })}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Remove one to add another.
        </p>
      )}
    </div>
  )
}

/** The pick and up to three more areas or units from anywhere, charted against the university, then the picked area's units, or every area without one; the codes are given over every census and shown over the range. */
export function CompareSection({
  areas,
  scope,
  compared,
  options,
  metric,
  range,
  scopeSources,
  onChange,
}: {
  areas: CodeTrend[]
  scope: ReportScope
  /** The areas and units added to the pick. */
  compared: CodeTrend[]
  options: CompareOption[]
  metric: ReportMetric
  range: YearRange
  scopeSources: SectionSource[]
  onChange: (patch: ReportSearch) => void
}) {
  const picked = scope.unit ?? scope.area
  const [all = scope.university, ...lines] = inRange(
    [scope.university, ...(picked ? [totalsOf(picked)] : []), ...compared],
    range,
  )
  const pick = picked ? lines[0] : undefined
  const area = scope.area && inRange([totalsOf(scope.area)], range)[0]
  const listed = area
    ? inRange(scope.units.map(totalsOf), range)
    : inRange(areas, range)
  return (
    <PageSection title="How does it compare?">
      <CompareWith
        options={options}
        pick={pick}
        compared={compared}
        onChange={onChange}
      />
      {lines.length > 0 ? (
        <CompareFigure codes={[...lines, all]} metric={metric} range={range} />
      ) : (
        <p>
          Choose a college or VP area in the filters, or add areas or units
          here, to chart them against the university.
        </p>
      )}
      <CompareTable
        codes={listed}
        totals={[...lines, all]}
        caption={
          area
            ? `${formatCount(listed.length)} units in ${area.name}, Fall ${range.from} to Fall ${range.to}`
            : `${formatCount(listed.length)} colleges and VP areas, Fall ${range.from} to Fall ${range.to}`
        }
        selected={pick?.code}
      />
      <Sources
        sources={[
          {
            kind: 'fall-range',
            ...range,
            computed: `${SPEND_METHOD} Each line is its figure in each census over its figure in Fall ${range.from}, times 100; changes are the last census’s figure over the first’s, less one. A unit’s jobs are those paid under its code or under a code this site joins to it by hand, so a unit that took over another’s jobs shows it as growth.`,
          },
          ...fySource(
            [all, ...lines, ...listed].flatMap(({ points }) => points),
          ),
          ...scopeSources,
        ]}
      />
    </PageSection>
  )
}
