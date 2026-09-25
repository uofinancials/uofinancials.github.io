import { SeriesChart } from '@/components/series-chart'
import { TrendsTable } from '@/components/trends-table'
import type { Trends } from '@/lib/trends'
import {
  METRIC_INFO,
  metricValues,
  type TrendMetric,
} from '@/lib/trends-search'

export function TrendsFigure({
  trends,
  metric,
  hidden,
  label,
}: {
  trends: Trends
  metric: TrendMetric
  hidden?: string[]
  label: string
}) {
  const { format, formatAxis } = METRIC_INFO[metric]
  return (
    <>
      <SeriesChart
        labels={trends.total.map(({ year }) => String(year))}
        series={metricValues(trends.series, metric)}
        hidden={hidden}
        format={format}
        formatAxis={formatAxis}
        label={label}
      />
      <TrendsTable
        series={trends.series}
        total={trends.total}
        metric={metric}
      />
    </>
  )
}
