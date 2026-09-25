import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatCount,
  formatDollars,
  formatFte,
  formatShare,
} from '@/lib/format'
import type { GroupTotals, Totals } from '@/lib/overview'

const NUMBER_CELL = 'text-right tabular-nums'
const NUMBER_HEADS = ['People', 'Jobs', 'FTE', 'Salary spend', 'Share']

function CountCells({ totals }: { totals: Totals }) {
  return (
    <>
      <TableCell className={NUMBER_CELL}>
        {formatCount(totals.people)}
      </TableCell>
      <TableCell className={NUMBER_CELL}>{formatCount(totals.jobs)}</TableCell>
      <TableCell className={NUMBER_CELL}>
        {formatFte(totals.fteHundredths)}
      </TableCell>
    </>
  )
}

/** Totals per group, with classified temporaries as a separate row outside the spend. */
export function TotalsTable({
  groupLabel,
  groups,
  totalSpendCents,
  temps,
}: {
  groupLabel: string
  groups: GroupTotals[]
  totalSpendCents: number
  temps: Totals
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{groupLabel}</TableHead>
          {NUMBER_HEADS.map((head) => (
            <TableHead key={head} scope="col" className="text-right">
              {head}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map(({ key, totals }) => (
          <TableRow key={key}>
            <TableHead scope="row" className="font-normal">
              {key}
            </TableHead>
            <CountCells totals={totals} />
            <TableCell className={NUMBER_CELL}>
              {formatDollars(totals.spendCents)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatShare(totals.spendCents, totalSpendCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableHead scope="row" className="font-normal">
            Classified temporaries
          </TableHead>
          <TableCell className={NUMBER_CELL}>
            {formatCount(temps.people)}
          </TableCell>
          <TableCell className={NUMBER_CELL}>
            {formatCount(temps.jobs)}
          </TableCell>
          <TableCell className={NUMBER_CELL}>
            {formatFte(temps.fteHundredths)}
          </TableCell>
          <TableCell colSpan={2} className="whitespace-normal">
            Not in salary spend: their published rates are annualised hourly
            rates, which overstate what they are paid.
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
