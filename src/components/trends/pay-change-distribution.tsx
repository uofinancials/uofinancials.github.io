import { BinTable } from '@/components/charts/bin-table'
import { StackedBarChart } from '@/components/charts/stacked-bar-chart'
import { SelectField } from '@/components/fields/select-field'
import { PageSection } from '@/components/layout/page-section'
import { stackedCounts } from '@/lib/census/groups'
import { formatCount } from '@/lib/shared/format'
import { pairLabel } from '@/lib/trends/pay-change-labels'
import {
  type ChangeDistribution,
  changeBinLabel,
  changeBinRange,
} from '@/lib/trends/pay-changes'
import { MIN_JOBS_SHOWN } from '@/lib/trends/trends'

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
    <PageSection title="One census pair">
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
    </PageSection>
  )
}
