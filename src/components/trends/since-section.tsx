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
  NO_VALUE,
} from '@/lib/shared/format'
import { changeOf } from '@/lib/shared/series'
import type { TrendPoint } from '@/lib/trends/trends'

function Detail({ children }: { children: ReactNode }) {
  return (
    <span className="block text-sm text-muted-foreground tabular-nums">
      {children}
    </span>
  )
}

function Change({ value }: { value: number | null }) {
  return (
    <span className="block font-semibold text-primary tabular-nums">
      {formatOrBlank(value, formatChange)}
    </span>
  )
}

/** Spend, jobs, median rate, and the staffing ratio in the last census, each against the first. */
export function SinceSection({
  scopeName,
  first,
  last,
  ratios,
  scopeSources,
}: {
  scopeName: string
  first: TrendPoint
  last: TrendPoint
  ratios: { first: number | null; last: number | null }
  scopeSources: SectionSource[]
}) {
  const spend = { first: first.spendCents, last: last.spendCents }
  const median = { first: first.medianRateCents, last: last.medianRateCents }
  return (
    <PageSection
      title={`What changed in ${scopeName} since Fall ${first.year}`}
    >
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
          <span className="block font-semibold text-primary tabular-nums">
            {ratios.first === null || ratios.last === null
              ? NO_VALUE
              : `${formatSigned(ratios.last - ratios.first)} per 100`}
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
          ...scopeSources,
        ]}
      />
    </PageSection>
  )
}
