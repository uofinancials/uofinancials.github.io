import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NO_VALUE } from '@/lib/format'
import type { Person } from '@/lib/person-lookup'
import { jobHistory } from '@/lib/person-summary'

const COLUMNS = [
  'Title',
  'Class or rank',
  'Pay department',
  'Job type',
  'Appointment',
  'Term',
]

/** Every job under the name, census by census, with the published fields that change most. */
export function PersonHistoryTable({ person }: { person: Person }) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Job history</h3>
      <p className="text-xs text-muted-foreground">
        As published. Censuses marked “linked” are in a run joined on the exact
        name and the same pay department of a single primary job, computed by
        this site.
      </p>
      <Table>
        <caption className="sr-only">{person.name}: job history</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Fall</TableHead>
            {COLUMNS.map((column) => (
              <TableHead key={column} scope="col">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobHistory(person).map((row) => (
            <TableRow key={row.key}>
              <TableHead scope="row" className="font-normal">
                {row.year}
                {row.isLinked && (
                  <span className="text-muted-foreground"> linked</span>
                )}
              </TableHead>
              <TableCell>{row.title}</TableCell>
              <TableCell>{row.classOrRank ?? NO_VALUE}</TableCell>
              <TableCell>{row.payDepartment}</TableCell>
              <TableCell>{row.jobType}</TableCell>
              <TableCell className="tabular-nums">{row.apptPercent}%</TableCell>
              <TableCell className="tabular-nums">
                {row.termOfServiceMonths} months
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}
