import type { ReactNode } from 'react'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { StatCard } from '@/components/layout/stat-card'
import { SPEND_METHOD } from '@/lib/census/totals'
import type { SectionSource } from '@/lib/shared/citation'
import {
  formatChange,
  formatCount,
  formatDollars,
  formatOrBlank,
  formatRatio,
  formatRoundedDollars,
  formatSigned,
} from '@/lib/shared/format'
import { changeOf } from '@/lib/shared/series'
import { ratioChange } from '@/lib/trends/report'
import { fySource, type TrendPoint } from '@/lib/trends/trends'

const CHANGE_CLASS = 'block font-medium tabular-nums'

function Detail({ children }: { children: ReactNode }) {
  return (
    <span className="block text-sm text-muted-foreground tabular-nums">
      {children}
    </span>
  )
}

function Change({ value }: { value: number | null }) {
  return (
    <span className={CHANGE_CLASS}>{formatOrBlank(value, formatChange)}</span>
  )
}

/** Spend, jobs, median rate, and the staffing ratio in the last census, each against the first; folded, a closed disclosure under its heading. */
export function SinceSection({
  scopeName,
  first,
  last,
  ratios,
  scopeSources,
  isFolded,
}: {
  scopeName: string
  first: TrendPoint
  last: TrendPoint
  ratios: { first: number | null; last: number | null }
  scopeSources: SectionSource[]
  /** Closed behind its heading, for a phone opened on a tab. */
  isFolded: boolean
}) {
  const spend = { first: first.spendCents, last: last.spendCents }
  const median = { first: first.medianRateCents, last: last.medianRateCents }
  const title = `What changed in ${scopeName} since Fall ${first.year}`
  const body = (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Salary spend"
          value={formatOrBlank(spend.last, formatRoundedDollars)}
        >
          <Detail>
            {formatOrBlank(spend.last, formatDollars)}, from{' '}
            {formatOrBlank(spend.first, formatDollars)}
          </Detail>
          <Change value={changeOf(spend.first, spend.last)} />
        </StatCard>
        <StatCard label="Jobs" value={formatCount(last.jobs)}>
          <Detail>from {formatCount(first.jobs)}</Detail>
          <Change value={changeOf(first.jobs, last.jobs)} />
        </StatCard>
        <StatCard
          label="Median salary rate"
          value={formatOrBlank(median.last, formatDollars)}
        >
          <Detail>from {formatOrBlank(median.first, formatDollars)}</Detail>
          <Change value={changeOf(median.first, median.last)} />
        </StatCard>
        <StatCard
          label="Admins and executives per 100 faculty jobs"
          value={formatOrBlank(ratios.last, formatRatio)}
        >
          <Detail>from {formatOrBlank(ratios.first, formatRatio)}</Detail>
          <span className={CHANGE_CLASS}>
            {formatOrBlank(
              ratioChange(ratios.first, ratios.last),
              (change) => `${formatSigned(change)} per 100`,
            )}
          </span>
        </StatCard>
      </div>
      <Sources
        sources={[
          {
            kind: 'fall-range',
            from: first.year,
            to: last.year,
            computed: `${SPEND_METHOD} Changes are the Fall ${last.year} figure over the Fall ${first.year} figure, less one; the ratio is as in “Which groups grew?”.`,
          },
          ...fySource([first, last]),
          ...scopeSources,
        ]}
      />
    </>
  )
  if (!isFolded) return <PageSection title={title}>{body}</PageSection>
  return (
    <details className="group">
      <summary className="cursor-pointer group-open:mb-4">
        <h2 className="inline text-section">{title}</h2>
      </summary>
      <div className="space-y-4">{body}</div>
    </details>
  )
}
