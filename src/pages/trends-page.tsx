import { useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { YearRangeFields } from '@/components/fields/year-range-fields'
import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { CompareSection } from '@/components/trends/compare-section'
import { GroupMapping } from '@/components/trends/group-mapping'
import { GrowthSection } from '@/components/trends/growth-section'
import { MoneySection } from '@/components/trends/money-section'
import { RaisesSection } from '@/components/trends/raises-section'
import { SinceSection } from '@/components/trends/since-section'
import { SplitSection } from '@/components/trends/split-section'
import { summaryQuery } from '@/data/queries'
import { ALL_OF_UO } from '@/lib/trends/compare'
import { staffingRows } from '@/lib/trends/report'
import {
  type ReportSearch,
  resolveReportView,
  type YearRange,
} from '@/lib/trends/search'
import { sliceTrends } from '@/lib/trends/trends'

const QUESTIONS = [
  ['since', 'What changed?'],
  ['groups-grew', 'Which groups grew?'],
  ['money', 'Where did the money go?'],
  ['pay-or-people', 'More people or higher pay?'],
  ['raises', 'What raises did people get?'],
  ['compare', 'How does my unit compare?'],
  ['groups', 'How are groups defined?'],
] as const

function QuestionLinks() {
  return (
    <nav aria-label="Questions on this page">
      <ul className="flex flex-wrap gap-2 text-sm">
        {QUESTIONS.map(([id, question]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="block rounded-full border px-3 py-1.5 hover:bg-muted"
            >
              {question}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function YearRangePanel({
  years,
  range: { from, to },
  onChange,
}: {
  years: number[]
  range: YearRange
  onChange: (patch: ReportSearch) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl bg-muted p-4">
      <YearRangeFields years={years} from={from} to={to} onChange={onChange} />
      <p className="text-sm text-muted-foreground">
        Every section compares Fall {to} with Fall {from}.
      </p>
    </div>
  )
}

/** The trends report: sections that each answer one question about the Fall censuses, over one year range. */
export function TrendsPage() {
  const navigate = useNavigate({ from: '/trends' })
  const { years, fiscalYears } = useLoaderData({ from: '/trends' })
  const search = useSearch({ from: '/trends' })
  const { data: summary } = useSuspenseQuery(summaryQuery)
  const { from, to, fromYears, growth, view, compare } = resolveReportView(
    search,
    years,
  )
  const range = { from, to }
  const trends = sliceTrends(summary.trends.all, from, to)
  const ratios = staffingRows(trends)
  const first = trends.total[0]
  const last = trends.total.at(-1)
  const handleChange = (patch: ReportSearch) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }) })
  return (
    <div className="space-y-10">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-title">
          How University of Oregon jobs and pay have changed since Fall {from}
        </h1>
        <p className="text-muted-foreground">
          Jobs, pay, and salary spend from the Fall census salary reports UO
          publishes, grouped so each group means the same jobs in every year.
        </p>
      </div>
      <QuestionLinks />
      <YearRangePanel years={years} range={range} onChange={handleChange} />
      {first && last && (
        <SinceSection
          first={first}
          last={last}
          ratios={{
            first: ratios[0]?.ratio ?? null,
            last: ratios.at(-1)?.ratio ?? null,
          }}
        />
      )}
      <GrowthSection
        trends={trends}
        ratios={ratios}
        range={range}
        metric={growth}
        view={view}
        onChange={handleChange}
      />
      <MoneySection trends={trends} range={range} />
      <SplitSection trends={trends} range={range} />
      <RaisesSection
        payChanges={summary.trends.payChanges}
        fromYears={fromYears}
        range={range}
      />
      <CompareSection
        areas={summary.trends.areas}
        university={{
          code: '',
          name: ALL_OF_UO,
          points: summary.trends.all.total,
        }}
        area={search.area ?? null}
        unit={search.unit ?? null}
        metric={compare}
        range={range}
        fiscalYears={fiscalYears}
        onChange={handleChange}
      />
      <CollapsibleSection id="groups" title="How are groups defined?">
        <p className="text-sm text-muted-foreground">
          UO restructured its EEO categories in 2018, 2019, and 2021. This site
          groups them so each group means the same jobs in every year.
        </p>
        <GroupMapping />
      </CollapsibleSection>
    </div>
  )
}
