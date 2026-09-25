import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FallRecord } from '@/data/fall'
import { personFields } from '@/lib/person-fields'

/** One census year's jobs under a name, a column per job and a row per published field. */
export function PersonRecordsTable({
  records,
  caption,
}: {
  records: FallRecord[]
  caption: string
}) {
  const columns = records.map((_, index) => `Job ${index + 1}`)
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Field</TableHead>
          {columns.map((column) => (
            <TableHead key={column} scope="col">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {personFields(records).map(({ label, values }) => (
          <TableRow key={label}>
            <TableHead scope="row" className="font-normal">
              {label}
            </TableHead>
            {columns.map((column, index) => (
              <TableCell
                key={column}
                className="whitespace-normal tabular-nums"
              >
                {values[index]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
