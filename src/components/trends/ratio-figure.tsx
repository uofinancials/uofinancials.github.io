import { SeriesChart } from '@/components/charts/series-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCount, formatOrBlank, formatRatio } from '@/lib/shared/format'
import { RATIO_BASE_GROUP, RATIO_GROUPS } from '@/lib/trends/report'
import { ratioAnswer } from '@/lib/trends/report-text'
import type { Trends } from '@/lib/trends/trends'
import { NUMBER_CELL } from '@/lib/utils'

const TITLE = 'Admins and executives per 100 faculty jobs'

function jobsIn(trends: Trends, key: string, index: number) {
  return (
    trends.series.find((line) => line.key === key)?.points[index]?.jobs ?? 0
  )
}

/** The staffing ratio in each census, as a line and a table of the jobs it counts. */
export function RatioFigure({
  ratios,
  trends,
}: {
  ratios: (number | null)[]
  trends: Trends
}) {
  const years = trends.total.map(({ year }) => year)
  const from = years[0] ?? 0
  const to = years.at(-1) ?? 0
  return (
    <div className="space-y-3">
      <h3 className="font-medium">{TITLE}</h3>
      <p>{ratioAnswer(ratios, { from, to })}</p>
      <SeriesChart
        labels={years.map(String)}
        series={[{ key: TITLE, values: ratios }]}
        format={formatRatio}
        formatAxis={formatRatio}
        label={`${TITLE}, Fall ${from} to Fall ${to}`}
        className="h-48"
      />
      <p className="text-sm text-muted-foreground">
        Counted from the published EEO categories, so it moves when they do: the
        jump in 2018 is the year UO restructured them.
      </p>
      <details className="text-sm">
        <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
          The jobs counted in every census
        </summary>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Fall</TableHead>
              {[...RATIO_GROUPS, RATIO_BASE_GROUP].map((group) => (
                <TableHead key={group} scope="col" className="text-right">
                  {group}
                </TableHead>
              ))}
              <TableHead scope="col" className="text-right">
                Per 100 faculty
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((year, index) => (
              <TableRow key={year}>
                <TableHead scope="row" className="font-normal">
                  {year}
                </TableHead>
                {[...RATIO_GROUPS, RATIO_BASE_GROUP].map((group) => (
                  <TableCell key={group} className={NUMBER_CELL}>
                    {formatCount(jobsIn(trends, group, index))}
                  </TableCell>
                ))}
                <TableCell className={NUMBER_CELL}>
                  {formatOrBlank(ratios[index], formatRatio)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  )
}
