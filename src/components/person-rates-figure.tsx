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
import type { PeerMedians } from '@/lib/peer-median'
import type { Person } from '@/lib/person-lookup'
import { MEDIAN_SERIES, personRates } from '@/lib/person-summary'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

const NUMBER_CELL = 'text-right tabular-nums'

/** Each job's published rate by census, as a chart and a table. */
export function PersonRatesFigure({
  person,
  medians,
}: {
  person: Person
  medians: PeerMedians
}) {
  const { years, series, medianGroups } = personRates(person, medians)
  const label = `${person.name}: annual salary rate by job, Fall ${years[0]}-${years.at(-1)}`
  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Salary rate by job</h2>
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
        title in the same job continues its line. A rate is the full-time annual
        rate, not pay: a part-time job's pay is lower, as its appointment % in
        the job history shows.
      </p>
      {medianGroups.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {MEDIAN_SERIES} is computed by this site: the median published rate of
          every primary job in that census with the same position class or rank
          and the same 9- or 12-month term as this name's primary job,
          classified temporaries left out, and shown only for {MIN_JOBS_SHOWN}{' '}
          or more jobs. Classified classes are matched on the class number,
          whatever its letter prefix, whose meaning UO does not publish;
          unclassified jobs with no rank are matched on their OA salary grade,
          published from 2016. Groups used: {medianGroups.join('; ')}.
        </p>
      )}
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
