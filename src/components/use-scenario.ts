import { useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useScenarioHistory } from '@/components/use-scenario-history'
import {
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  opeRatesQuery,
  outlookQuery,
} from '@/data/queries'
import { toDepartmentCensus } from '@/lib/department-jobs'
import { egShares } from '@/lib/eg-share'
import { fiscalYearOf } from '@/lib/overview'
import { freezeHistoryCensuses } from '@/lib/scenario-freeze'
import { baselines, scenarioOutlook } from '@/lib/scenario-outlook'
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
  const firstYear =
    projection.fiscalYears.find((year) => year > censusFiscalYear) ??
    censusFiscalYear
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

/** The latest census, the URL's rules and baseline, and what they save against it. */
export function useScenario() {
  const search = useSearch({ from: '/scenarios' })
  const data = useScenarioData()
  const { rates, projection, census, shares, options, censusFiscalYear } = data
  const { rules, dropped } = useMemo(
    () => parseRules(search.rules ?? []),
    [search.rules],
  )
  const history = useScenarioHistory(
    rules.some((rule) => rule.kind === 'freeze'),
    data.historyCensuses,
  )
  const baselineIndex = resolveBaselineIndex(search.case, options.length)
  const baseline = options[baselineIndex] ?? options[0]
  if (!baseline) throw new Error('The projection has no baseline')
  const outcome = useMemo(
    () =>
      scenarioOutlook({
        census,
        censusFiscalYear,
        rules,
        rates,
        egShares: shares,
        history: history.history,
        fiscalYears: projection.fiscalYears,
        baseline,
      }),
    [
      census,
      censusFiscalYear,
      rules,
      rates,
      shares,
      history.history,
      projection,
      baseline,
    ],
  )
  return {
    ...data,
    rules,
    dropped,
    history,
    baselines: options,
    baselineIndex,
    ...outcome,
  }
}
