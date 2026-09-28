import { BarCell } from '@/components/charts/bar-cell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GroupRow } from '@/lib/people/list'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/shared/format'
import { shareOfLargest } from '@/lib/shared/series'
import { NUMBER_CELL } from '@/lib/utils'

/** A table of each group's jobs, with bars, and median rate. */
export function GroupJobsFigure({
  rows,
  label,
}: {
  rows: GroupRow[]
  label: string
}) {
  const shares = shareOfLargest(rows.map(({ jobs }) => jobs))
  return (
    <Table>
      <caption className="sr-only">{label}</caption>
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
        {rows.map(({ group, jobs, medianRateCents }, index) => (
          <TableRow key={group}>
            <TableHead scope="row" className="font-normal">
              {group}
            </TableHead>
            <BarCell share={shares[index] ?? 0}>{formatCount(jobs)}</BarCell>
            <TableCell className={NUMBER_CELL}>
              {formatOrBlank(medianRateCents, formatDollars)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
