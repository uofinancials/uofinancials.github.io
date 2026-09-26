import { BinTable } from '@/components/bin-table'
import { StackedBarChart } from '@/components/stacked-bar-chart'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/format'
import {
  binLabel,
  binRange,
  type Distribution,
  PERCENTILES,
  type SalaryBin,
} from '@/lib/salary-distribution'
import { stackedCounts, type TrendGroup } from '@/lib/trend-groups'

function Summary({
  distribution,
  groups,
}: {
  distribution: Distribution
  groups: TrendGroup[]
}) {
  const { counts, percentiles, maxRateCents } = distribution
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {groups.map((group) => (
        <div key={group} className="contents">
          <dt className="text-muted-foreground">{group}</dt>
          <dd className="tabular-nums">{formatCount(counts[group])}</dd>
        </div>
      ))}
      {PERCENTILES.map((p) => (
        <div key={p} className="contents">
          <dt className="text-muted-foreground">
            {p === 50 ? 'Median' : `${p}th percentile`} rate, primary jobs
          </dt>
          <dd className="tabular-nums">
            {formatOrBlank(percentiles?.[p], formatDollars)}
          </dd>
        </div>
      ))}
      <dt className="text-muted-foreground">Highest rate</dt>
      <dd className="tabular-nums">
        {formatOrBlank(maxRateCents, formatDollars)}
      </dd>
    </dl>
  )
}

/** Jobs by salary rate range, stacked by group, with the count, percentiles, and the table behind a toggle; each range is choosable through `onSelectBin`. */
export function SalaryDistributionFigure({
  distribution,
  label,
  onSelectBin,
}: {
  distribution: Distribution
  label: string
  onSelectBin: (bin: SalaryBin) => void
}) {
  const stacks = stackedCounts(distribution)
  const groups = stacks.map(({ key }) => key)
  return (
    <section className="space-y-4">
      <StackedBarChart
        labels={distribution.bins.map(binLabel)}
        series={stacks}
        label={label}
        onSelect={(index) => {
          const bin = distribution.bins[index]
          if (bin) onSelectBin(bin)
        }}
      />
      <details className="space-y-4">
        <summary className="cursor-pointer text-sm">
          The chart’s numbers
        </summary>
        <Summary distribution={distribution} groups={groups} />
        <BinTable
          bins={distribution.bins}
          groups={groups}
          heading="Salary rate"
          rowKey={(bin) => bin.floorCents}
          rowHeader={(bin) => (
            <button
              type="button"
              className="underline"
              onClick={() => onSelectBin(bin)}
            >
              {binRange(bin)}
            </button>
          )}
        />
      </details>
    </section>
  )
}
