import { Link } from '@tanstack/react-router'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { fiscalYearLabel } from '@/data/budget'
import type { CitedSource } from '@/data/cited-source'
import type { Projection } from '@/data/outlook'
import type { ExampleAnswer } from '@/lib/home/home'
import { EG_SHARE_METHOD } from '@/lib/scenario/eg-share'
import { FULL_COST_METHOD } from '@/lib/scenario/jobs'
import { OPE_GROUP_METHOD } from '@/lib/scenario/ope-groups'
import { SCENARIO_OUTLOOK_METHOD } from '@/lib/scenario/outlook'
import { SCENARIO_METHOD } from '@/lib/scenario/scenario'
import { toSearchRules } from '@/lib/scenario/search'
import { formatDollars, formatShare } from '@/lib/shared/format'
import { RAISE_ROW_METHOD } from '@/lib/trends/raise-groups'

const METHODS = [
  SCENARIO_METHOD,
  FULL_COST_METHOD,
  OPE_GROUP_METHOD,
  EG_SHARE_METHOD,
  SCENARIO_OUTLOOK_METHOD,
  RAISE_ROW_METHOD,
]

function Answer({ answer }: { answer: ExampleAnswer }) {
  const year = fiscalYearLabel(answer.fiscalYear)
  return (
    <li>
      <Link
        to="/scenarios"
        search={{ rules: toSearchRules(answer.rules) }}
        className="link"
      >
        {answer.question}
      </Link>{' '}
      About {formatDollars(answer.savingsCents)} of E&G savings in {year}
      {answer.gapShare !== null &&
        `, ${formatShare(answer.gapShare, 1)} of the projected ${year} shortfall`}
      .
    </li>
  )
}

/** Scenario examples with their estimated savings against the projection, each opening its scenario. */
export function ScenarioAnswers({
  answers,
  year,
  fiscalYear,
  projection,
  raiseSources,
}: {
  answers: ExampleAnswer[]
  year: number
  fiscalYear: number
  projection: Projection
  /** The raise terms the first year's savings are grown by. */
  raiseSources: CitedSource[]
}) {
  return (
    <PageSection title="What could close it?">
      <p className="text-sm text-muted-foreground">
        These are this site's estimates over the Fall {year} census, not
        predictions, and not recommendations about any person. Savings are
        gross: no revenue a change would lose is counted.
      </p>
      <ul className="list-disc space-y-2 pl-6">
        {answers.map((answer) => (
          <Answer key={answer.question} answer={answer} />
        ))}
      </ul>
      <p>
        <Link to="/scenarios" className="link">
          Build your own scenario
        </Link>{' '}
        from pay cuts, thresholds, hiring and raise freezes, and department
        eliminations.
      </p>
      <details className="text-sm">
        <summary>How these are estimated</summary>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          {METHODS.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
      </details>
      <Sources
        sources={[
          { kind: 'data', ref: { kind: 'fall', year } },
          { kind: 'data', ref: { kind: 'budget', fiscalYear } },
          { kind: 'data', ref: { kind: 'rates' } },
          { kind: 'document', source: projection.source },
          ...raiseSources.map((source) => ({
            kind: 'document' as const,
            source,
          })),
        ]}
      />
    </PageSection>
  )
}
