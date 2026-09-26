import { TotalsChart } from '@/components/totals-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/format'
import type { GroupRow } from '@/lib/people-list'
import { NUMBER_CELL } from '@/lib/utils'

/** Jobs per group as bars, and a table of each group's jobs and median rate. */
export function GroupJobsFigure({
  rows,
  label,
}: {
  rows: GroupRow[]
  label: string
}) {
  return (
    <section className="space-y-4">
      <TotalsChart
        bars={rows.map(({ group, jobs }) => ({ key: group, value: jobs }))}
        valueLabel="Jobs"
        format={formatCount}
        label={label}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Group</TableHead>
            <TableHead scope="col" className="text-right">
              Jobs
            </TableHead>
            <TableHead scope="col" className="text-right">
              Median rate, primary jobs
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ group, jobs, medianRateCents }) => (
            <TableRow key={group}>
              <TableHead scope="row" className="font-normal">
                {group}
              </TableHead>
              <TableCell className={NUMBER_CELL}>{formatCount(jobs)}</TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(medianRateCents, formatDollars)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}
