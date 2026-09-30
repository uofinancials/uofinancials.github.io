import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TEMPS_GROUP } from '@/lib/census/groups'
import type { GroupTotals, Totals } from '@/lib/census/totals'
import {
  formatCount,
  formatDollars,
  formatFte,
  formatShare,
  NO_VALUE,
} from '@/lib/shared/format'
import { shareOfLargest } from '@/lib/shared/series'
import { NUMBER_CELL } from '@/lib/utils'
import { BarCell } from './bar-cell'

const NUMBER_HEADS = ['People', 'Jobs', 'FTE', 'Salary spend', 'Share']
/** Classified temporaries' figures a list of jobs cannot give, since their pay is known by unit. */
const BLANK_FIGURES = NUMBER_HEADS.slice(2)

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

/** Totals per group, then classified temporaries' people and jobs, their spend and FTE blank. */
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
  const shares = shareOfLargest(groups.map(({ totals }) => totals.spendCents))
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
        {groups.map(({ key, totals }, index) => (
          <TableRow key={key}>
            <TableHead scope="row" className="font-normal">
              {key}
            </TableHead>
            <CountCells totals={totals} />
            <BarCell share={shares[index] ?? 0}>
              {formatDollars(totals.spendCents)}
            </BarCell>
            <TableCell className={NUMBER_CELL}>
              {formatShare(totals.spendCents, totalSpendCents)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableHead scope="row" className="font-normal">
            {TEMPS_GROUP}
          </TableHead>
          <TableCell className={NUMBER_CELL}>
            {formatCount(temps.people)}
          </TableCell>
          <TableCell className={NUMBER_CELL}>
            {formatCount(temps.jobs)}
          </TableCell>
          {BLANK_FIGURES.map((figure) => (
            <TableCell key={figure} className={NUMBER_CELL}>
              {NO_VALUE}
            </TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  )
}
