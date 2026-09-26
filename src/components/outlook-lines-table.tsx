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
import { formatDollars, formatOrBlank, formatWeeks } from '@/lib/format'
import { cn, NUMBER_CELL } from '@/lib/utils'

function Row({
  label,
  years,
  values,
  format = formatDollars,
  isTotal = false,
}: {
  label: string
  years: number[]
  values: number[]
  format?: (value: number) => string
  isTotal?: boolean
}) {
  return (
    <TableRow>
      <TableHead
        scope="row"
        className={cn(isTotal ? 'font-medium' : 'pl-6 font-normal')}
      >
        {label}
      </TableHead>
      {years.map((year, index) => (
        <TableCell
          key={year}
          className={cn(NUMBER_CELL, isTotal && 'font-medium')}
        >
          {formatOrBlank(values[index], format)}
        </TableCell>
      ))}
    </TableRow>
  )
}

/** Every published line of a projection's base case, by fiscal year. */
export function OutlookLinesTable({ projection }: { projection: Projection }) {
  const years = projection.fiscalYears
  return (
    <Table>
      <caption className="sr-only">
        {projection.title}, every published line, in dollars
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Line</TableHead>
          {years.map((year) => (
            <TableHead key={year} scope="col" className="text-right">
              {fiscalYearLabel(year)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {projection.lines.map((line) => (
          <Row
            key={`${line.section} ${line.label}`}
            label={line.label}
            years={years}
            values={line.cents}
            isTotal={line.kind !== 'line'}
          />
        ))}
        <Row
          label="Run rate"
          years={years}
          values={projection.runRateCents}
          isTotal
        />
        <Row
          label="Beginning fund balance"
          years={years}
          values={projection.beginningFundBalanceCents}
        />
        <Row
          label="Ending fund balance"
          years={years}
          values={projection.endingFundBalanceCents}
        />
        <Row
          label="Weeks of operating expenses"
          years={years}
          values={projection.weeksOfExpenses}
          format={formatWeeks}
        />
      </TableBody>
    </Table>
  )
}
