import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fiscalYearLabel } from '@/data/budget'
import type { Projection } from '@/data/outlook'
import { formatDollars, formatOrBlank } from '@/lib/format'

const NUMBER_CELL = 'text-right tabular-nums'

/** Each published case's run rate by fiscal year, its present value, and its final ending fund balance. */
export function OutlookCasesTable({ projection }: { projection: Projection }) {
  const years = projection.fiscalYears
  const finalYear = years.at(-1)
  return (
    <Table>
      <caption className="sr-only">
        Run rate by case and fiscal year, in dollars
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Case</TableHead>
          {years.map((year) => (
            <TableHead key={year} scope="col" className="text-right">
              {fiscalYearLabel(year)}
            </TableHead>
          ))}
          <TableHead scope="col" className="text-right">
            Present value
          </TableHead>
          {finalYear !== undefined && (
            <TableHead scope="col" className="text-right">
              Ending fund balance, {fiscalYearLabel(finalYear)}
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {projection.cases.map((scenario) => (
          <TableRow key={scenario.label}>
            <TableHead scope="row" className="font-normal">
              {scenario.label}
            </TableHead>
            {years.map((year, index) => (
              <TableCell key={year} className={NUMBER_CELL}>
                {formatOrBlank(scenario.runRateCents[index], formatDollars)}
              </TableCell>
            ))}
            <TableCell className={NUMBER_CELL}>
              {formatDollars(scenario.presentValueCents)}
            </TableCell>
            {finalYear !== undefined && (
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(
                  scenario.endingFundBalanceCents.at(-1),
                  formatDollars,
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
