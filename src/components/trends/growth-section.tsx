import { ReferenceLine } from 'recharts'
import { SeriesChart } from '@/components/charts/series-chart'
import { RadioField } from '@/components/fields/radio-field'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { TrendsTable } from '@/components/trends/table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SPEND_METHOD } from '@/lib/census/totals'
import { formatChange, formatIndex, formatOrBlank } from '@/lib/shared/format'
import {
  ALL_JOBS,
  changeTable,
  indexedGroups,
  RATIO_BASE_GROUP,
  RATIO_GROUPS,
  staffingRatio,
  UNPAID_GROUP,
} from '@/lib/trends/report'
import { growthAnswer, unindexedNote } from '@/lib/trends/report-text'
import {
  METRIC_INFO,
  REPORT_METRICS,
  type ReportMetric,
} from '@/lib/trends/search'
import { MIN_JOBS_SHOWN, type Trends } from '@/lib/trends/trends'
import { NUMBER_CELL } from '@/lib/utils'
import { RatioFigure } from './ratio-figure'

const INDEX_BASE = 100
/** The first census after UO restructured its EEO categories. */
const RESTRUCTURE_YEAR = 2018

const METRIC_OPTIONS = REPORT_METRICS.map(
  (metric) => [metric, METRIC_INFO[metric].label] as const,
)

const METHOD = `Each line is a group’s figure in each census over its figure in the first census shown, times 100. Change is the last census’s figure over the first’s, less one. ${SPEND_METHOD} FTE is each job’s appointment percent, summed. Median salary rate is the median published annual salary rate of primary jobs, temporaries left out. Spend is not shown for fewer than ${MIN_JOBS_SHOWN} paid jobs, nor a median for fewer than ${MIN_JOBS_SHOWN} primary jobs. Dollars are as published, not adjusted for inflation.`

const RATIO_METHOD = `${RATIO_GROUPS.join(' and ')} jobs over ${RATIO_BASE_GROUP} jobs in each census, times 100, counting jobs rather than people or FTE.`

function ChangeTable({
  trends,
  from,
  to,
}: {
  trends: Trends
  from: number
  to: number
}) {
  return (
    <Table>
      <caption className="sr-only">
        Change by group, Fall {from} to Fall {to}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Group</TableHead>
          {REPORT_METRICS.map((metric) => (
            <TableHead key={metric} scope="col" className="text-right">
              {METRIC_INFO[metric].label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {changeTable(trends).map((row) => (
          <TableRow key={row.key}>
            <TableHead
              scope="row"
              className={row.key === ALL_JOBS ? '' : 'font-normal'}
            >
              {row.key}
            </TableHead>
            {REPORT_METRICS.map((metric) => (
              <TableCell key={metric} className={NUMBER_CELL}>
                {formatOrBlank(row[metric], formatChange)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Each group's growth since the first census, indexed, with the change table and the staffing ratio. */
export function GrowthSection({
  trends,
  from,
  to,
  metric,
  onMetric,
}: {
  trends: Trends
  from: number
  to: number
  metric: ReportMetric
  onMetric: (metric: ReportMetric) => void
}) {
  const { lines, hidden, unindexed } = indexedGroups(trends, metric)
  const labels = trends.total.map(({ year }) => String(year))
  const title = `${METRIC_INFO[metric].label} by group, Fall ${from} = 100`
  const note = unindexedNote(unindexed, metric, from)
  const isRestructureShown = from < RESTRUCTURE_YEAR && to >= RESTRUCTURE_YEAR
  return (
    <PageSection id="groups-grew" title="Which groups grew?">
      <p>{growthAnswer(changeTable(trends), metric, from)}</p>
      <RadioField
        legend="Measure"
        name="growth"
        value={metric}
        options={METRIC_OPTIONS}
        onSelect={onMetric}
      />
      <SeriesChart
        labels={labels}
        series={lines}
        hidden={hidden}
        format={formatIndex}
        formatAxis={formatIndex}
        label={title}
        marker={
          isRestructureShown
            ? { x: String(RESTRUCTURE_YEAR), label: 'Categories restructured' }
            : undefined
        }
        hasEndLabels
        isZeroBased={false}
      >
        <ReferenceLine y={INDEX_BASE} stroke="var(--foreground)" />
      </SeriesChart>
      <p className="text-sm text-muted-foreground">
        {note}
        {note && ' '}
        {UNPAID_GROUP}, whose number swings from year to year, are in the table
        only. UO restructured its EEO categories in 2018, 2019, and 2021, and in
        2017 published some unclassified jobs with no category; the groups below
        keep each group the same jobs in every year.
      </p>
      <ChangeTable trends={trends} from={from} to={to} />
      <details className="text-sm">
        <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
          {METRIC_INFO[metric].label} by group in every census
        </summary>
        <TrendsTable
          series={trends.series}
          total={trends.total}
          metric={metric}
        />
      </details>
      <RatioFigure ratios={staffingRatio(trends)} trends={trends} />
      <Sources
        sources={[{ kind: 'fall-range', from, to, computed: METHOD }]}
        methods={[RATIO_METHOD]}
      />
    </PageSection>
  )
}
