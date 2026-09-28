import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatOrBlank } from '@/lib/shared/format'
import { METRIC_INFO, type ReportMetric } from '@/lib/trends/search'
import type { TrendPoint, TrendSeries } from '@/lib/trends/trends'
import { NUMBER_CELL } from '@/lib/utils'

/** The selected metric by census year, a column per series and one for their total. */
export function TrendsTable({
  series,
  total,
  metric,
}: {
  series: TrendSeries[]
  total: TrendPoint[]
  metric: ReportMetric
}) {
  const { pick, format } = METRIC_INFO[metric]
  const cell = (point: TrendPoint | undefined) =>
    formatOrBlank(point ? pick(point) : null, format)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Fall</TableHead>
          {series.map(({ key }) => (
            <TableHead key={key} scope="col" className="text-right">
              {key}
            </TableHead>
          ))}
          <TableHead scope="col" className="text-right">
            Total
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {total.map((point, index) => (
          <TableRow key={point.year}>
            <TableHead scope="row" className="font-normal">
              {point.year}
            </TableHead>
            {series.map(({ key, points }) => (
              <TableCell key={key} className={NUMBER_CELL}>
                {cell(points[index])}
              </TableCell>
            ))}
            <TableCell className={NUMBER_CELL}>{cell(point)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
