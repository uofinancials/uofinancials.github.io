import { SeriesChart } from '@/components/series-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatCompactDollars,
  formatDollars,
  formatOrBlank,
} from '@/lib/format'
import type { Person } from '@/lib/person-lookup'
import { personRates, TOTAL_SERIES } from '@/lib/person-summary'

const NUMBER_CELL = 'text-right tabular-nums'

/** Each job's published rate and the estimated total by census, as a chart and a table. */
export function PersonRatesFigure({ person }: { person: Person }) {
  const { years, series } = personRates(person)
  const label = `${person.name}: annual salary rate by job, Fall ${years[0]}-${years.at(-1)}`
  return (
    <section className="space-y-4">
      <h3 className="font-semibold">Salary rate by job</h3>
      <SeriesChart
        labels={years.map(String)}
        series={series}
        format={formatDollars}
        formatAxis={formatCompactDollars}
        label={label}
      />
      <p className="text-xs text-muted-foreground">
        Each job line is its published annual salary rate, gapped where a census
        lists no such job; a job is its job type and pay department, so a new
        title in the same job continues its line. {TOTAL_SERIES} is computed by
        this site: the sum of each job's rate × its appointment %, with jobs on
        unpaid leave as zero, as the other pages estimate spend. It estimates
        annual pay, and overstates classified temporaries' pay, whose rates are
        annualised hourly rates.
      </p>
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
          {years.map((year, index) => (
            <TableRow key={year}>
              <TableHead scope="row" className="font-normal">
                {year}
              </TableHead>
              {series.map(({ key, values }) => (
                <TableCell key={key} className={NUMBER_CELL}>
                  {formatOrBlank(values[index], formatDollars)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}
