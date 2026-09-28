import { SmallMultiples } from '@/components/charts/small-multiples'
import { TrendsTable } from '@/components/trends/table'
import {
  type CensusMetric,
  METRIC_INFO,
  metricPanels,
} from '@/lib/trends/search'
import type { Trends } from '@/lib/trends/trends'

export function TrendsFigure({
  trends,
  metric,
  hidden = [],
  label,
}: {
  trends: Trends
  metric: CensusMetric
  hidden?: string[]
  label: string
}) {
  const { format, formatAxis } = METRIC_INFO[metric]
  return (
    <>
      <SmallMultiples
        labels={trends.total.map(({ year }) => String(year))}
        series={metricPanels(trends, metric, hidden)}
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
