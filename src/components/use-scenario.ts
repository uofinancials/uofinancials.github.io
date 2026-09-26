import { useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useSearch } from '@tanstack/react-router'
import { useDeferredValue, useMemo } from 'react'
import { useScenarioHistory } from '@/components/use-scenario-history'
import {
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  opeRatesQuery,
  outlookQuery,
} from '@/data/queries'
import {
  type DepartmentCensus,
  toDepartmentCensus,
} from '@/lib/department-jobs'
import { egShares } from '@/lib/eg-share'
import { fiscalYearOf } from '@/lib/overview'
import type { Rule } from '@/lib/scenario'
import { freezeHistoryCensuses } from '@/lib/scenario-freeze'
import { scenarioResultRows } from '@/lib/scenario-labels'
import {
  baselines,
  firstSavingsYear,
  outlookRows,
  projectScenario,
} from '@/lib/scenario-outlook'
import { parseRules, resolveBaselineIndex } from '@/lib/scenario-search'

/** The route's census joined to its budget, with the rates, outlook, and E&G shares. */
function useScenarioData() {
  const { year, fiscalYear, censusDate } = useLoaderData({
    from: '/scenarios',
  })
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const { data: fall } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  const { data: rates } = useSuspenseQuery(opeRatesQuery)
  const { data: outlook } = useSuspenseQuery(outlookQuery)
  const [projection] = outlook.projections
  const census = useMemo(
    () => toDepartmentCensus({ year, records: fall.records }, budget),
    [year, fall, budget],
  )
  const shares = useMemo(() => egShares(census, budget), [census, budget])
  const historyCensuses = useMemo(
    () => freezeHistoryCensuses(manifest, rates),
    [manifest, rates],
  )
  const options = useMemo(() => baselines(projection), [projection])
  const censusFiscalYear = fiscalYearOf(censusDate)
  const firstYear = firstSavingsYear(projection.fiscalYears, censusFiscalYear)
  return {
    budget,
    rates,
    projection,
    census,
    shares,
    historyCensuses,
    options,
    censusFiscalYear,
    firstYear,
  }
}

type ScenarioData = ReturnType<typeof useScenarioData>

/** The engine's result over the rules, and each rule's row in the savings table. */
function useScenarioResult(
  data: ScenarioData,
  rules: Rule[],
  history: DepartmentCensus[],
) {
  const { census, censusFiscalYear, rates, shares, projection, budget } = data
  const result = useMemo(
    () =>
      projectScenario({
        census,
        censusFiscalYear,
        rules,
        rates,
        egShares: shares,
        history,
        fiscalYears: projection.fiscalYears,
      }),
    [census, censusFiscalYear, rules, rates, shares, history, projection],
  )
  const resultRows = useMemo(
    () => scenarioResultRows(rules, result, census, budget),
    [rules, result, census, budget],
  )
  return { result, resultRows }
}

/**
 * The latest census, the URL's rules and baseline, and what they save
 * against it. The engine runs on `computedRules`, which trail `rules` while
 * the reader types, so editing never waits on it.
 */
export function useScenario() {
  const search = useSearch({ from: '/scenarios' })
  const data = useScenarioData()
  const { rules, dropped } = useMemo(
    () => parseRules(search.rules ?? []),
    [search.rules],
  )
  const computedRules = useDeferredValue(rules)
  const history = useScenarioHistory(
    computedRules.some((rule) => rule.kind === 'freeze'),
    data.historyCensuses,
  )
  const { options, projection, censusFiscalYear } = data
  const baseline =
    options[
      resolveBaselineIndex(
        search.case,
        options.map(({ label }) => label),
      )
    ]
  if (!baseline) throw new Error('The projection has no baseline')
  const { result, resultRows } = useScenarioResult(
    data,
    computedRules,
    history.history,
  )
  const rows = useMemo(
    () =>
      outlookRows({
        result,
        fiscalYears: projection.fiscalYears,
        baseline,
        censusFiscalYear,
      }),
    [result, projection, baseline, censusFiscalYear],
  )
  return {
    ...data,
    rules,
    computedRules,
    dropped,
    history,
    baselines: options,
    baseline,
    result,
    resultRows,
    rows,
  }
}
