import { SelectField } from '@/components/select-field'
import { StackedBarChart } from '@/components/stacked-bar-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCount } from '@/lib/format'
import {
  type ChangeDistribution,
  changeBinLabel,
  changeBinRange,
  pairLabel,
} from '@/lib/pay-changes'
import { stackedCounts } from '@/lib/trend-groups'
import { MIN_JOBS_SHOWN } from '@/lib/trends'
import { NUMBER_CELL } from '@/lib/utils'

/** The chosen census pair's jobs by change in rate, as a stacked histogram and a table. */
export function PayChangeDistribution({
  distribution,
  pair,
  fromYears,
  onPair,
}: {
  distribution: ChangeDistribution
  pair: number
  fromYears: number[]
  onPair: (fromYear: number) => void
}) {
  const stacks = stackedCounts(distribution)
  const label = `Continuing jobs by change in salary rate, Fall ${pairLabel(pair)}`
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">One census pair</h2>
      <SelectField
        label="Fall"
        value={String(pair)}
        options={fromYears.map((fromYear) => [
          String(fromYear),
          pairLabel(fromYear),
        ])}
        onSelect={(value) => onPair(Number(value))}
      />
      {distribution.total < MIN_JOBS_SHOWN ? (
        <p>
          {formatCount(distribution.total)} continuing jobs match. The
          distribution is shown for {MIN_JOBS_SHOWN} or more.
        </p>
      ) : (
        <>
          <h3 className="font-medium">{label}</h3>
          <StackedBarChart
            labels={distribution.bins.map(changeBinLabel)}
            series={stacks}
            label={label}
          />
          <Table>
            <caption className="sr-only">{label}</caption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Change</TableHead>
                {stacks.map(({ key }) => (
                  <TableHead key={key} scope="col" className="text-right">
                    {key}
                  </TableHead>
                ))}
                <TableHead scope="col" className="text-right">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribution.bins.map((bin) => (
                <TableRow key={changeBinLabel(bin)}>
                  <TableHead scope="row" className="font-normal">
                    {changeBinRange(bin)}
                  </TableHead>
                  {stacks.map(({ key }) => (
                    <TableCell key={key} className={NUMBER_CELL}>
                      {formatCount(bin.counts[key])}
                    </TableCell>
                  ))}
                  <TableCell className={NUMBER_CELL}>
                    {formatCount(bin.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </section>
  )
}
