import { Link } from '@tanstack/react-router'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { SPEND_METHOD } from '@/lib/census/totals'
import type { SectionSource } from '@/lib/shared/citation'
import {
  formatDollarChange,
  formatOrBlank,
  formatPercent,
} from '@/lib/shared/format'
import { shareOfLargest } from '@/lib/shared/series'
import { ALL_JOBS } from '@/lib/trends/report'
import { moneyAnswer } from '@/lib/trends/report-text'
import type { YearRange } from '@/lib/trends/search'
import {
  type SpendContribution,
  type SpendShareRow,
  spendContributions,
  spendShares,
} from '@/lib/trends/spend'
import type { Trends } from '@/lib/trends/trends'
import { widthOf } from '@/lib/utils'
import { groupColor } from './group-color'
import { GroupTable } from './group-table'

const METHOD = `${SPEND_METHOD} A group’s share is its spend over all spend in the census; its share of the rise is its change in spend over the change in all spend. A group with no job in a census counts as no spend there.`

function Swatch({ group }: { group: string }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-sm"
      style={{ background: groupColor(group) }}
    />
  )
}

function ShareBar({
  rows,
  pick,
}: {
  rows: SpendShareRow[]
  pick: (row: SpendShareRow) => number | null
}) {
  return (
    <div aria-hidden className="flex h-6 w-full overflow-hidden rounded-sm">
      {rows.map((row) => (
        <span
          key={row.key}
          className="h-full border-r border-background last:border-r-0"
          style={{
            width: widthOf(pick(row) ?? 0),
            background: groupColor(row.key),
          }}
        />
      ))}
    </div>
  )
}

function SharesFigure({
  rows,
  range: { from, to },
}: {
  rows: SpendShareRow[]
  range: YearRange
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Share of salary spend</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-muted-foreground tabular-nums">Fall {from}</span>
        <ShareBar rows={rows} pick={({ first }) => first} />
        <span className="text-muted-foreground tabular-nums">Fall {to}</span>
        <ShareBar rows={rows} pick={({ last }) => last} />
      </div>
      <GroupTable
        caption={`Share of salary spend by group, Fall ${from} and Fall ${to}`}
        columns={[`Fall ${from}`, `Fall ${to}`]}
        rows={rows.map(({ key, first, last }) => ({
          key,
          label: (
            <span className="flex items-center gap-2">
              <Swatch group={key} />
              {key}
            </span>
          ),
          cells: [
            { value: formatOrBlank(first, formatPercent) },
            { value: formatOrBlank(last, formatPercent) },
          ],
        }))}
      />
    </div>
  )
}

function RiseTable({
  rows,
  range: { from, to },
}: {
  rows: SpendContribution[]
  range: YearRange
}) {
  const bars = shareOfLargest(
    rows.map(({ key, changeCents }) => (key === ALL_JOBS ? null : changeCents)),
  )
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Change in salary spend by group</h3>
      <GroupTable
        caption={`Change in salary spend by group, Fall ${from} to Fall ${to}`}
        columns={['Change', 'Of the change']}
        rows={rows.map(({ key, changeCents, share }, index) => ({
          key,
          isTotal: key === ALL_JOBS,
          cells: [
            {
              value: formatOrBlank(changeCents, formatDollarChange),
              share: key === ALL_JOBS ? undefined : bars[index],
            },
            { value: formatOrBlank(share, formatPercent) },
          ],
        }))}
      />
    </div>
  )
}

/** Each group's share of salary spend in the first and last census, and its part of the change between them. */
export function MoneySection({
  trends,
  range,
  scopeSources,
}: {
  trends: Trends
  range: YearRange
  scopeSources: SectionSource[]
}) {
  const contributions = spendContributions(trends)
  return (
    <PageSection id="money" title="Where did the money go?">
      <p>{moneyAnswer(contributions, range)}</p>
      <SharesFigure rows={spendShares(trends)} range={range} />
      <RiseTable rows={contributions} range={range} />
      <p className="text-sm text-muted-foreground">
        Salary spend counts pay from every fund; the{' '}
        <Link className="link" to="/budget">
          budget outlook
        </Link>{' '}
        projects the E&amp;G fund only, so the two are not the same money.
      </p>
      <Sources
        sources={[
          { kind: 'fall-range', ...range, computed: METHOD },
          ...scopeSources,
        ]}
      />
    </PageSection>
  )
}
