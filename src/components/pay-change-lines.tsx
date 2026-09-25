import { SeriesChart } from '@/components/series-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatChange, formatOrBlank } from '@/lib/format'
import { type ChangeSeries, pairLabel } from '@/lib/pay-changes'

const NUMBER_CELL = 'text-right tabular-nums'

/** Each line's median change per census pair, as a chart and a table. */
export function PayChangeLines({
  series,
  fromYears,
  label,
}: {
  series: ChangeSeries[]
  fromYears: number[]
  label: string
}) {
  return (
    <>
      <SeriesChart
        labels={fromYears.map(pairLabel)}
        series={series.map(({ key, points }) => ({
          key,
          values: points.map(({ median }) => median),
        }))}
        format={formatChange}
        formatAxis={formatChange}
        label={label}
      />
      <Table>
        <caption className="sr-only">{label}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Fall</TableHead>
            {series.map(({ key }) => (
              <TableHead key={key} scope="col" className="text-right">
                {key}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fromYears.map((fromYear, index) => (
            <TableRow key={fromYear}>
              <TableHead scope="row" className="font-normal">
                {pairLabel(fromYear)}
              </TableHead>
              {series.map(({ key, points }) => (
                <TableCell key={key} className={NUMBER_CELL}>
                  {formatOrBlank(points[index]?.median, formatChange)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
