import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MIN_JOBS_SHOWN } from '@/lib/department-jobs'
import { formatCount, formatShare, NO_VALUE } from '@/lib/format'
import { type ChangeCounts, pairLabel } from '@/lib/pay-changes'

const NUMBER_CELL = 'text-right tabular-nums'

const COLUMNS: {
  heading: string
  count: (row: ChangeCounts) => number
  of: (row: ChangeCounts) => number
}[] = [
  {
    heading: 'Class changed, of classified',
    count: (row) => row.classChanged,
    of: (row) => row.classified,
  },
  {
    heading: 'Rank changed, of unclassified',
    count: (row) => row.rankChanged,
    of: (row) => row.unclassified,
  },
  {
    heading: 'Rank not published, of unclassified',
    count: (row) => row.rankUnpublished,
    of: (row) => row.unclassified,
  },
  {
    heading: 'Title changed, of all',
    count: (row) => row.titleChanged,
    of: (row) => row.pairs,
  },
]

/** Each census pair's counts of changed class, rank, and title, with their share; blank below `MIN_JOBS_SHOWN` pairs. */
export function PayChangeCountsTable({
  rows,
  caption,
}: {
  rows: ChangeCounts[]
  caption: string
}) {
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Fall</TableHead>
          <TableHead scope="col" className="text-right">
            Continuing jobs
          </TableHead>
          {COLUMNS.map(({ heading }) => (
            <TableHead key={heading} scope="col" className="text-right">
              {heading}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.fromYear}>
            <TableHead scope="row" className="font-normal">
              {pairLabel(row.fromYear)}
            </TableHead>
            <TableCell className={NUMBER_CELL}>
              {formatCount(row.pairs)}
            </TableCell>
            {COLUMNS.map(({ heading, count, of }) => (
              <TableCell key={heading} className={NUMBER_CELL}>
                {row.pairs < MIN_JOBS_SHOWN || of(row) === 0
                  ? NO_VALUE
                  : `${formatCount(count(row))} (${formatShare(count(row), of(row))})`}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
