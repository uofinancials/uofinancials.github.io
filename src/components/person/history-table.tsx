import { PageSection } from '@/components/layout/page-section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HISTORY_LABELS } from '@/lib/people/person-fields'
import type { Person } from '@/lib/people/person-lookup'
import { jobHistory } from '@/lib/people/person-summary'

/** Every job of the person, census by census, with the published fields that change most, and the name each was published under where there is more than one. */
export function PersonHistoryTable({ person }: { person: Person }) {
  const hasNames = person.otherNames.length > 0
  return (
    <PageSection title="Job history">
      <p className="text-sm text-muted-foreground">
        As published. Censuses marked “linked” are in a run joined on the name,
        or on names this site joins as one person, and the same pay department
        of a single primary job, codes this site joins to one unit counting as
        one, computed by this site.
      </p>
      <Table>
        <caption className="sr-only">{person.name}: job history</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Fall</TableHead>
            {hasNames && <TableHead scope="col">Name as published</TableHead>}
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
              {hasNames && <TableCell>{row.name}</TableCell>}
              {HISTORY_LABELS.map((column, index) => (
                <TableCell key={column}>{row.values[index]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageSection>
  )
}
