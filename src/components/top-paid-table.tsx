import { Link } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FallRecord } from '@/data/fall'
import { formatDollars } from '@/lib/format'
import { recordKey } from '@/lib/people-list'
import { titleOf } from '@/lib/person-fields'

/** Jobs as published, each name linked to its person page for the census year. */
export function TopPaidTable({
  jobs,
  year,
}: {
  jobs: FallRecord[]
  year: number
}) {
  return (
    <Table>
      <caption className="sr-only">
        The highest published annual salary rates, Fall {year}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Name</TableHead>
          <TableHead scope="col">Title</TableHead>
          <TableHead scope="col">Pay department</TableHead>
          <TableHead scope="col" className="text-right">
            Annual salary rate
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={recordKey(job)}>
            <TableHead
              scope="row"
              className="min-w-36 font-normal whitespace-normal"
            >
              <Link
                className="underline"
                to="/people/$name"
                params={{ name: job.name }}
                search={{ year }}
              >
                {job.name}
              </Link>
            </TableHead>
            <TableCell className="min-w-32 whitespace-normal">
              {titleOf(job)}
            </TableCell>
            <TableCell className="min-w-32 whitespace-normal">
              {job.payDepartment.name}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatDollars(job.annualSalaryRateCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
