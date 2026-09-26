import { BinTable } from '@/components/bin-table'
import { SelectField } from '@/components/select-field'
import { StackedBarChart } from '@/components/stacked-bar-chart'
import { formatCount } from '@/lib/format'
import {
  type ChangeDistribution,
  changeBinLabel,
  changeBinRange,
  pairLabel,
} from '@/lib/pay-changes'
import { stackedCounts } from '@/lib/trend-groups'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

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
          <BinTable
            bins={distribution.bins}
            groups={stacks.map(({ key }) => key)}
            heading="Change"
            caption={label}
            rowKey={changeBinLabel}
            rowHeader={changeBinRange}
          />
        </>
      )}
    </section>
  )
}
