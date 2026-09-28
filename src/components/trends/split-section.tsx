import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { SPEND_METHOD } from '@/lib/census/totals'
import {
  formatChange,
  formatDollarChange,
  formatDollars,
  formatOrBlank,
} from '@/lib/shared/format'
import { ALL_JOBS } from '@/lib/trends/report'
import { splitAnswer } from '@/lib/trends/report-text'
import type { YearRange } from '@/lib/trends/search'
import {
  stepBars,
  type VolumeAndPay,
  volumeAndPay,
  volumeAndPayByGroup,
} from '@/lib/trends/spend'
import type { Trends } from '@/lib/trends/trends'
import { cn, widthOf } from '@/lib/utils'
import { GroupTable } from './group-table'

function stepLabels({ from, to }: YearRange): Record<string, string> {
  return {
    first: `Salary spend, Fall ${from}`,
    volume: `Change in FTE, at Fall ${from} spend per FTE`,
    pay: 'Change in spend per FTE',
    last: `Salary spend, Fall ${to}`,
  }
}

function StepFigure({
  split,
  range,
}: {
  split: VolumeAndPay
  range: YearRange
}) {
  const labels = stepLabels(range)
  return (
    <ul className="space-y-3">
      {stepBars(split).map(({ key, cents, offset, width }) => {
        const isTotal = key === 'first' || key === 'last'
        return (
          <li
            key={key}
            className="grid gap-1 text-sm md:grid-cols-[18rem_1fr_9rem] md:items-center md:gap-4"
          >
            <span>{labels[key]}</span>
            <span aria-hidden className="relative block h-5">
              <span
                className={cn(
                  'absolute inset-y-0 rounded-sm',
                  isTotal ? 'bg-muted-foreground/60' : 'bg-chart',
                )}
                style={{ left: widthOf(offset), width: widthOf(width) }}
              />
            </span>
            <span className="tabular-nums md:text-right">
              {isTotal ? formatDollars(cents) : formatDollarChange(cents)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** The change in salary spend split into more FTE and higher pay per FTE, in all and by group. */
export function SplitSection({
  trends,
  range,
}: {
  trends: Trends
  range: YearRange
}) {
  const split = volumeAndPay(trends)
  const method = `${SPEND_METHOD} FTE leaves out classified temporaries, as salary spend does. The change in FTE at Fall ${range.from} spend per FTE is the change in FTE times Fall ${range.from} spend over Fall ${range.from} FTE; the rest of the change in spend is the change in spend per FTE.`
  return (
    <PageSection id="pay-or-people" title="More people, or higher pay?">
      {split ? (
        <>
          <p>{splitAnswer(split, range.from)}</p>
          <StepFigure split={split} range={range} />
          <GroupTable
            caption="Change in FTE and in salary spend per FTE by group"
            columns={['FTE', 'Spend per FTE']}
            rows={volumeAndPayByGroup(trends, split).map(
              ({ key, fte, perFte }) => ({
                key,
                isTotal: key === ALL_JOBS,
                cells: [
                  { value: formatOrBlank(fte, formatChange) },
                  { value: formatOrBlank(perFte, formatChange) },
                ],
              }),
            )}
          />
        </>
      ) : (
        <p>
          Spend or FTE is missing in Fall {range.from} or Fall {range.to}.
        </p>
      )}
      <Sources sources={[{ kind: 'fall-range', ...range, computed: method }]} />
    </PageSection>
  )
}
