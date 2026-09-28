import { useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { SelectField } from '@/components/fields/select-field'
import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { CompareSection } from '@/components/trends/compare-section'
import { GroupMapping } from '@/components/trends/group-mapping'
import { GrowthSection } from '@/components/trends/growth-section'
import { MoneySection } from '@/components/trends/money-section'
import { RaisesSection } from '@/components/trends/raises-section'
import { SinceSection } from '@/components/trends/since-section'
import { SplitSection } from '@/components/trends/split-section'
import { summaryQuery } from '@/data/queries'
import { staffingRatio } from '@/lib/trends/report'
import { resolveReportView, type TrendsSearch } from '@/lib/trends/search'
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

/** Opens a section a phone shows closed, so a link to it lands on its contents. */
function openSection(id: string) {
  const section = document.getElementById(id)
  if (section instanceof HTMLDetailsElement) section.open = true
}

function QuestionLinks() {
  return (
    <nav aria-label="Questions on this page">
      <ul className="flex flex-wrap gap-2 text-sm">
        {QUESTIONS.map(([id, question]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="block rounded-full border px-3 py-1.5 hover:bg-muted"
              onClick={() => openSection(id)}
            >
              {question}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function YearRange({
  years,
  from,
  to,
  onChange,
}: {
  years: number[]
  from: number
  to: number
  onChange: (patch: TrendsSearch) => void
}) {
  const options = years.map((year): [string, string] => [
    String(year),
    `Fall ${year}`,
  ])
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl bg-muted p-4">
      <SelectField
        label="From"
        value={String(from)}
        options={options}
        onSelect={(value) => onChange({ from: Number(value) })}
      />
      <SelectField
        label="To"
        value={String(to)}
        options={options}
        onSelect={(value) => onChange({ to: Number(value) })}
      />
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
  const { from, to, fromYears, growth, compare } = resolveReportView(
    search,
    years,
  )
  const trends = sliceTrends(summary.trends.all, from, to)
  const ratios = staffingRatio(trends)
  const first = trends.total[0]
  const last = trends.total.at(-1)
  const handleChange = (patch: TrendsSearch) =>
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
      <YearRange years={years} from={from} to={to} onChange={handleChange} />
      {first && last && (
        <SinceSection
          first={first}
          last={last}
          ratios={{ first: ratios[0] ?? null, last: ratios.at(-1) ?? null }}
        />
      )}
      <GrowthSection
        trends={trends}
        from={from}
        to={to}
        metric={growth}
        onMetric={(metric) => handleChange({ growth: metric })}
      />
      <MoneySection trends={trends} from={from} to={to} />
      <SplitSection trends={trends} from={from} to={to} />
      <RaisesSection
        payChanges={summary.trends.payChanges}
        fromYears={fromYears}
        from={from}
        to={to}
      />
      <CompareSection
        areas={summary.trends.areas}
        total={summary.trends.all.total}
        area={search.area ?? null}
        unit={search.unit ?? null}
        metric={compare}
        range={{ from, to }}
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
