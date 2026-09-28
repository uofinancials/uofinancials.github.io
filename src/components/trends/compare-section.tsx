import { Link } from '@tanstack/react-router'
import { IndexFigure } from '@/components/charts/index-figure'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import type { CodeTrend } from '@/data/summary'
import { SPEND_METHOD } from '@/lib/census/totals'
import type { SectionSource } from '@/lib/shared/citation'
import { formatChange, formatCount, formatOrBlank } from '@/lib/shared/format'
import {
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
  METRIC_INFO,
  type ReportMetric,
  type YearRange,
} from '@/lib/trends/search'
import { type GroupRow, GroupTable } from './group-table'

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

/** The picked area, or unit against its area, charted against the university, then the area's units, or every area when none is picked; the codes are given over every census and shown over the range. */
export function CompareSection({
  areas,
  scope,
  metric,
  range,
  scopeSources,
}: {
  areas: CodeTrend[]
  scope: ReportScope
  metric: ReportMetric
  range: YearRange
  scopeSources: SectionSource[]
}) {
  const [all = scope.university, ...shownAreas] = inRange(
    [scope.university, ...areas],
    range,
  )
  const area = scope.area && inRange([totalsOf(scope.area)], range)[0]
  const unit = scope.unit && inRange([totalsOf(scope.unit)], range)[0]
  return (
    <PageSection title="How does it compare?">
      {area ? (
        <>
          <CompareFigure
            codes={unit ? [unit, area, all] : [area, all]}
            metric={metric}
            range={range}
          />
          <CompareTable
            codes={inRange(scope.units.map(totalsOf), range)}
            totals={[area, all]}
            caption={`Units in ${area.name}, Fall ${range.from} to Fall ${range.to}`}
            selected={unit?.code}
          />
        </>
      ) : (
        <>
          <p>
            Choose a college or VP area in the filters to chart it, or one of
            its units, against the university.
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
          ...scopeSources,
        ]}
      />
    </PageSection>
  )
}
