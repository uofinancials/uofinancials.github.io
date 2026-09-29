import { IndexFigure } from '@/components/charts/index-figure'
import { RadioField } from '@/components/fields/radio-field'
import { SUMMARY_CLASS } from '@/components/layout/disclosure-class'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { TrendsTable } from '@/components/trends/table'
import { SPEND_METHOD } from '@/lib/census/totals'
import type { SectionSource } from '@/lib/shared/citation'
import { formatChange, formatOrBlank } from '@/lib/shared/format'
import {
  ALL_JOBS,
  changeTable,
  indexedGroups,
  RATIO_BASE_GROUP,
  RATIO_GROUPS,
  type RatioRow,
  UNPAID_GROUP,
} from '@/lib/trends/report'
import { growthAnswer, unindexedNote } from '@/lib/trends/report-text'
import {
  GROWTH_VIEW_OPTIONS,
  type GrowthView,
  METRIC_INFO,
  REPORT_METRICS,
  type ReportMetric,
  type ReportSearch,
  type YearRange,
} from '@/lib/trends/search'
import { MIN_JOBS_SHOWN, type Trends } from '@/lib/trends/trends'
import { GroupTable } from './group-table'
import { RatioFigure } from './ratio-figure'

/** The first census after UO restructured its EEO categories. */
const RESTRUCTURE_YEAR = 2018

const METHOD = `Each line is a group’s figure in each census over its figure in the first census shown, times 100. Change is the last census’s figure over the first’s, less one. ${SPEND_METHOD} FTE is each job’s appointment percent, summed. Median salary rate is the median published annual salary rate of primary jobs, temporaries left out. Spend is not shown for fewer than ${MIN_JOBS_SHOWN} paid jobs, nor a median for fewer than ${MIN_JOBS_SHOWN} primary jobs. Dollars are as published, not adjusted for inflation.`

const RATIO_METHOD = `${RATIO_GROUPS.join(' and ')} jobs over ${RATIO_BASE_GROUP} jobs in each census, times 100, counting jobs rather than people or FTE.`

/** Each group's growth since the first census, indexed, with the change table and the staffing ratio. */
export function GrowthSection({
  trends,
  ratios,
  range: { from, to },
  metric,
  view,
  scopeSources,
  onChange,
}: {
  trends: Trends
  ratios: RatioRow[]
  range: YearRange
  metric: ReportMetric
  view: GrowthView
  scopeSources: SectionSource[]
  onChange: (patch: ReportSearch) => void
}) {
  const { lines, hidden, unindexed } = indexedGroups(trends, metric)
  const rows = changeTable(trends)
  const charted = rows.filter(({ key }) => !hidden.includes(key))
  const note = unindexedNote(
    unindexed.filter((key) => key !== UNPAID_GROUP),
    metric,
    from,
  )
  const isRestructureShown = from < RESTRUCTURE_YEAR && to >= RESTRUCTURE_YEAR
  return (
    <PageSection title="Which groups grew?">
      <p>{growthAnswer(charted, metric, from)}</p>
      <div className="hidden md:block">
        <RadioField
          legend="Show"
          name="view"
          value={view}
          options={GROWTH_VIEW_OPTIONS}
          onSelect={(value) => onChange({ view: value })}
        />
      </div>
      <IndexFigure
        view={view}
        emphasis={ALL_JOBS}
        labels={trends.total.map(({ year }) => String(year))}
        lines={lines}
        hidden={hidden}
        changes={charted.map((row) => ({ key: row.key, change: row[metric] }))}
        label={`${METRIC_INFO[metric].label} by group, Fall ${from} = 100`}
        barsLabel={`Change in ${METRIC_INFO[metric].noun} by group, Fall ${from} to Fall ${to}`}
        marker={
          isRestructureShown
            ? { x: String(RESTRUCTURE_YEAR), label: 'Categories restructured' }
            : undefined
        }
      />
      <p className="text-sm text-muted-foreground">
        {note}
        {note && ' '}
        {UNPAID_GROUP}, whose number swings from year to year, are in the table
        only. UO restructured its EEO categories in 2018, 2019, and 2021, and in
        2017 published some unclassified jobs with no category; the groups below
        keep each group the same jobs in every year.
      </p>
      <GroupTable
        caption={`Change by group, Fall ${from} to Fall ${to}`}
        columns={REPORT_METRICS.map((column) => METRIC_INFO[column].label)}
        rows={rows.map((row) => ({
          key: row.key,
          isTotal: row.key === ALL_JOBS,
          cells: REPORT_METRICS.map((column) => ({
            value: formatOrBlank(row[column], formatChange),
          })),
        }))}
      />
      <details className="text-sm">
        <summary className={SUMMARY_CLASS}>
          {METRIC_INFO[metric].label} by group in every census
        </summary>
        <TrendsTable
          series={trends.series}
          total={trends.total}
          metric={metric}
        />
      </details>
      <RatioFigure rows={ratios} />
      <Sources
        sources={[
          { kind: 'fall-range', from, to, computed: METHOD },
          ...scopeSources,
        ]}
        methods={[RATIO_METHOD]}
      />
    </PageSection>
  )
}
