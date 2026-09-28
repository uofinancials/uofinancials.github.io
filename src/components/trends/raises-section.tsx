import { Link } from '@tanstack/react-router'
import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { Sources } from '@/components/layout/sources'
import type { Summary } from '@/data/summary'
import { formatChange, formatOrBlank } from '@/lib/shared/format'
import {
  ALL_PAIRS,
  CONTINUING_JOB_METHOD,
  pairLabel,
  RATE_NOTE,
} from '@/lib/trends/pay-change-labels'
import { heatLevel, raiseRows } from '@/lib/trends/report'
import { raisesAnswer } from '@/lib/trends/report-text'
import type { YearRange } from '@/lib/trends/search'
import { GroupTable } from './group-table'

/** Each shading level's cell classes, from no change to the largest. */
const HEAT_CLASSES = [
  '',
  'bg-chart/10',
  'bg-chart/20',
  'bg-chart/35',
  'bg-chart/55',
  'bg-chart text-background',
]

const CHAINED_METHOD =
  'Chained is each pair’s median change compounded, one after another; it is not any one person’s raise.'

/** Continuing jobs' median change in salary rate by group and census pair, shaded by size, with each row chained. */
export function RaisesSection({
  payChanges,
  fromYears,
  range,
}: {
  payChanges: Summary['trends']['payChanges']
  fromYears: number[]
  range: YearRange
}) {
  const rows = raiseRows(payChanges, fromYears)
  return (
    <CollapsibleSection
      id="raises"
      title="What raises did people who stayed get?"
    >
      {fromYears.length === 0 ? (
        <p>A change needs two consecutive censuses; choose a wider range.</p>
      ) : (
        <>
          <p>{raisesAnswer(rows, fromYears)}</p>
          <p className="text-sm text-muted-foreground">{RATE_NOTE}</p>
          <GroupTable
            caption="Median change in salary rate, continuing jobs, by group and census pair"
            columns={[...fromYears.map(pairLabel), 'Chained']}
            rows={rows.map(({ key, medians, chained }) => ({
              key,
              isTotal: key === ALL_PAIRS,
              cells: [
                ...medians.map((median) => ({
                  value: formatOrBlank(median, formatChange),
                  className:
                    median === null ? '' : HEAT_CLASSES[heatLevel(median)],
                })),
                {
                  value: formatOrBlank(chained, formatChange),
                  className: 'font-semibold',
                },
              ],
            }))}
          />
        </>
      )}
      <p className="text-sm">
        <Link className="link" to="/trends/pay-changes">
          Pay changes by department, area, or class or rank, one pair’s
          distribution, and raises beside the contract terms
        </Link>
      </p>
      <Sources
        sources={[
          { kind: 'fall-range', ...range, computed: CONTINUING_JOB_METHOD },
        ]}
        methods={[CHAINED_METHOD]}
      />
    </CollapsibleSection>
  )
}
