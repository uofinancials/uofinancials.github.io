import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { CitedLine } from '@/components/cited-line'
import { ScenarioOutlookSection } from '@/components/scenario-outlook-section'
import { ScenarioResultsTable } from '@/components/scenario-results-table'
import { SourceCitation } from '@/components/source-citation'
import { useScenario } from '@/components/use-scenario'
import { fiscalYearLabel } from '@/data/budget'
import { EG_SHARE_METHOD } from '@/lib/eg-share'
import { formatCount, formatDollars } from '@/lib/format'
import { OPE_GROUP_METHOD } from '@/lib/ope-groups'
import { SCENARIO_METHOD } from '@/lib/scenario'
import { SCENARIO_EXAMPLES } from '@/lib/scenario-examples'
import { FREEZE_METHOD } from '@/lib/scenario-freeze'
import { FULL_COST_METHOD } from '@/lib/scenario-jobs'
import { describeRule, describeScope } from '@/lib/scenario-labels'
import { SCENARIO_OUTLOOK_METHOD } from '@/lib/scenario-outlook'
import { toSearchRules } from '@/lib/scenario-search'

const METHODS = [
  SCENARIO_METHOD,
  FULL_COST_METHOD,
  OPE_GROUP_METHOD,
  EG_SHARE_METHOD,
  FREEZE_METHOD,
  SCENARIO_OUTLOOK_METHOD,
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Examples() {
  return (
    <ul className="list-disc space-y-1 pl-6">
      {SCENARIO_EXAMPLES.map(({ question, rules }) => (
        <li key={question}>
          <Link
            to="/scenarios"
            search={{ rules: toSearchRules(rules) }}
            className="underline"
          >
            {question}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Sources({ scenario }: { scenario: ReturnType<typeof useScenario> }) {
  const { census, projection, history, historyCensuses } = scenario
  const [first] = historyCensuses
  return (
    <div className="space-y-2">
      <SourceCitation source={{ kind: 'fall', year: census.year }} />
      <SourceCitation
        source={{ kind: 'budget', fiscalYear: census.fiscalYear }}
      />
      <SourceCitation source={{ kind: 'rates' }} />
      {history.status === 'ready' && first && (
        <SourceCitation
          source={{ kind: 'fall-range', from: first.year, to: census.year }}
        />
      )}
      <CitedLine source={projection.source} />
      <CitedLine source={projection.casesSource} />
    </div>
  )
}

export function ScenariosPage() {
  const scenario = useScenario()
  const { census, budget, rules, dropped, result, rows, history, firstYear } =
    scenario
  const navigate = useNavigate({ from: '/scenarios' })
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <p>
          Stack rules over the Fall {census.year} census and see what each would
          save, and what the savings would do to the E&G fund projected in “
          {scenario.projection.title}”.
        </p>
        <p className="text-sm text-muted-foreground">
          Every figure computed here is this site's estimate, not a prediction,
          and not a recommendation about any person. Savings are gross: no
          revenue a change would lose is counted.
        </p>
      </div>
      <Section title="Examples">
        <Examples />
      </Section>
      <Section title="Rules">
        {dropped > 0 && (
          <p role="status">
            {formatCount(dropped)} {dropped === 1 ? 'rule' : 'rules'} in the
            link could not be read and {dropped === 1 ? 'was' : 'were'} left
            out.
          </p>
        )}
        {rules.length === 0 && (
          <p>No rules yet. Start from an example above.</p>
        )}
        <p className="text-sm text-muted-foreground">
          Fall {census.year} has {formatCount(result.base.jobs)} jobs a scenario
          can change, costing {formatDollars(result.base.salaryCents)} in salary
          and {formatDollars(result.base.egCents)} in E&G at{' '}
          {fiscalYearLabel(firstYear)} rates; {formatCount(result.temporaries)}{' '}
          classified temporaries are left out.
        </p>
      </Section>
      {rules.length > 0 && (
        <Section title="Savings by rule">
          <ScenarioResultsTable
            rows={rules.flatMap((rule, index) => {
              const ruleResult = result.rules[index]
              return ruleResult
                ? [
                    {
                      key: `${index} ${rule.kind}`,
                      label: describeRule(rule),
                      scope: describeScope(rule.scope, census, budget),
                      result: ruleResult,
                    },
                  ]
                : []
            })}
            total={result.total}
            firstYear={firstYear}
            historyStatus={history.status}
            reductionTargetCents={scenario.projection.reductionTargetCents}
          />
        </Section>
      )}
      <Section title="Against the projection">
        <ScenarioOutlookSection
          rows={rows}
          baselines={scenario.baselines}
          baselineIndex={scenario.baselineIndex}
          isHistoryPending={history.status === 'loading'}
          onSelectBaseline={(index) =>
            navigate({
              search: (previous) => ({ ...previous, case: index }),
              replace: true,
            })
          }
        />
        {history.status === 'error' && (
          <p role="alert">
            The past censuses could not be loaded, so the freeze is not counted.
          </p>
        )}
      </Section>
      <Section title="How this is estimated">
        <ul className="list-disc space-y-2 pl-6 text-sm">
          {METHODS.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
        <Sources scenario={scenario} />
      </Section>
    </div>
  )
}
