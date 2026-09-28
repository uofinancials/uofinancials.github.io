import { SmallMultiples } from '@/components/charts/small-multiples'
import { TrendsTable } from '@/components/trends/table'
import {
  type CensusMetric,
  METRIC_INFO,
  metricValues,
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
  const { format, formatAxis, pick } = METRIC_INFO[metric]
  const shown = metricValues(trends.series, metric).filter(
    ({ key }) => !hidden.includes(key),
  )
  return (
    <>
      <SmallMultiples
        labels={trends.total.map(({ year }) => String(year))}
        series={[{ key: 'Total', values: trends.total.map(pick) }, ...shown]}
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
