import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HISTORY_LABELS } from '@/lib/person-fields'
import type { Person } from '@/lib/person-lookup'
import { jobHistory } from '@/lib/person-summary'

/** Every job under the name, census by census, with the published fields that change most. */
export function PersonHistoryTable({ person }: { person: Person }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Job history</h2>
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
            {HISTORY_LABELS.map((column) => (
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
              {HISTORY_LABELS.map((column, index) => (
                <TableCell key={column}>{row.values[index]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}
