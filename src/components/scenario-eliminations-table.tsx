import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fiscalYearLabel } from '@/data/budget'
import { formatCount, formatDollars } from '@/lib/format'
import type { EliminatedTotal, EliminationResult } from '@/lib/scenario'
import { smallReachNote } from '@/lib/scenario-labels'
import { NUMBER_CELL } from '@/lib/utils'

const HEADS = [
  'Census jobs',
  'E&G pay',
  'E&G OPE',
  'E&G S&S',
  'E&G total',
  'All funds',
]
const COVERED_NOTE =
  'An earlier elimination already covers this unit, so it saves nothing more.'
const PARTLY_MATCHED_NOTE =
  "The census files most of this unit's staff under other codes, so pay rules in this scenario may also count some of them."

function Notes({ result }: { result: EliminationResult }) {
  const reach = smallReachNote(result.jobs)
  return (
    <>
      {result.isCovered && (
        <span className="block text-muted-foreground">{COVERED_NOTE}</span>
      )}
      {result.isPartlyMatched && (
        <span className="block text-muted-foreground">
          {PARTLY_MATCHED_NOTE}
        </span>
      )}
      {reach && <span className="block text-muted-foreground">{reach}</span>}
    </>
  )
}

/** Each elimination's budget lines in stack order, and their total. */
export function ScenarioEliminationsTable({
  rows,
  total,
  period,
}: {
  rows: { position: number; result: EliminationResult }[]
  total: EliminatedTotal
  period: string
}) {
  const cents = (value: number) => (
    <TableCell className={NUMBER_CELL}>{formatDollars(value)}</TableCell>
  )
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        From the {fiscalYearLabel(total.fiscalYear)} budget as of posting period{' '}
        {Number(period)}. E&G is fund type 11, the fund the projection covers.
      </p>
      <Table>
        <caption className="sr-only">
          Eliminations in stack order, by budget line, and their total
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Elimination</TableHead>
            {HEADS.map((head) => (
              <TableHead key={head} scope="col" className="text-right">
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ position, result }) => (
            <TableRow key={`${position} ${result.code}`}>
              <TableHead scope="row" className="font-normal whitespace-normal">
                {position}. {result.isArea ? 'All of ' : ''}
                {result.name} ({result.code})
                <Notes result={result} />
              </TableHead>
              <TableCell className={NUMBER_CELL}>
                {formatCount(result.jobs)}
              </TableCell>
              {cents(result.eg.payCents)}
              {cents(result.eg.opeCents)}
              {cents(result.eg.servicesCents)}
              {cents(result.egCents)}
              {cents(result.allFundsCents)}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead scope="row">Eliminations</TableHead>
            <TableCell colSpan={4} />
            {cents(total.egCents)}
            {cents(total.allFundsCents)}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
