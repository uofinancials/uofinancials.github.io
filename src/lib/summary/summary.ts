import type { BudgetYear } from '../../data/budget.ts'
import { censusYearOf, type FallYear } from '../../data/fall.ts'
import type { Manifest } from '../../data/manifest.ts'
import type { OpeRates } from '../../data/ope.ts'
import type { Outlook } from '../../data/outlook.ts'
import type { RaiseTerms } from '../../data/raises.ts'
import type { AreaTrends, Summary } from '../../data/summary.ts'
import { fiscalYearOf, selectOverviewSources } from '../census/totals.ts'
import {
  type DepartmentCensus,
  toDepartmentCensuses,
} from '../departments/jobs.ts'
import {
  areaFigures,
  departmentRows,
  latestTableYears,
} from '../departments/table.ts'
import {
  exampleAnswers,
  headlineFigures,
  placementBases,
  TOP_PAID_COUNT,
  topPaidJobs,
} from '../home/home.ts'
import { peerMedians } from '../people/peer-median.ts'
import { indexPeople, personYearsOf } from '../people/person-lookup.ts'
import { firstSavingsYear } from '../scenario/outlook.ts'
import { raiseRates } from '../scenario/raises.ts'
import { areaTrends } from '../trends/area-trends.ts'
import {
  type ChangeSeries,
  continuingPairs,
  payChangeTrends,
} from '../trends/pay-changes.ts'
import { buildTrends, pairYears } from '../trends/trends.ts'

/** The committed data files a summary is derived from. */
export type SummaryInputs = {
  manifest: Manifest
  falls: FallYear[]
  budgets: BudgetYear[]
  outlook: Outlook
  rates: OpeRates
  raiseTerms: RaiseTerms
}

type TableYear = { census: DepartmentCensus; budget: BudgetYear }

function latestYears({ manifest, falls, budgets }: SummaryInputs) {
  const censuses = toDepartmentCensuses(manifest, falls, budgets)
  const years = latestTableYears(censuses, budgets)
  if (!years) throw new Error('The summary needs two Fall censuses')
  return years
}

/** Continuing jobs' median pay change for all of UO, and each area's and its units' trends and pay changes, placed as the department pages place them. */
export type TrendScopes = { payChanges: ChangeSeries[]; areas: AreaTrends[] }

export function buildTrendScopes({
  manifest,
  falls,
  budgets,
}: SummaryInputs): TrendScopes {
  const pairs = continuingPairs(falls)
  const years = falls.map(({ censusDate }) => censusYearOf(censusDate))
  return {
    payChanges: payChangeTrends(
      pairs,
      pairYears(years, Math.min(...years), Math.max(...years)),
      null,
    ),
    areas: areaTrends(toDepartmentCensuses(manifest, falls, budgets), pairs),
  }
}

function summarizeTrends(
  { falls }: SummaryInputs,
  scopes: TrendScopes,
): Summary['trends'] {
  const censuses = falls.map(({ censusDate, records }) => ({
    year: censusYearOf(censusDate),
    records,
  }))
  const years = censuses.map(({ year }) => year)
  return {
    all: buildTrends(censuses, {
      kind: 'all',
      group: null,
      dept: null,
      position: null,
      jobs: null,
      from: Math.min(...years),
      to: Math.max(...years),
    }),
    payChanges: scopes.payChanges,
    areas: scopes.areas.map(({ code, name, trends }) => ({
      code,
      name,
      points: trends.total,
    })),
  }
}

function summarizeDepartments(years: {
  now: TableYear
  before: TableYear
}): Summary['departments'] {
  const tableYear = ({ census }: TableYear) => ({
    year: census.year,
    fiscalYear: census.fiscalYear,
  })
  return {
    now: tableYear(years.now),
    before: tableYear(years.before),
    rows: departmentRows(years.now, years.before),
  }
}

function summarizeHome(
  inputs: SummaryInputs,
  { census, budget }: TableYear,
): Summary['home'] {
  const { year, records, fiscalYear } = census
  const { censusDate } = selectOverviewSources(inputs.manifest).census
  const [projection] = inputs.outlook.projections
  const censusFiscalYear = fiscalYearOf(censusDate)
  const answers = exampleAnswers({
    census,
    budget,
    rates: inputs.rates,
    projection,
    censusFiscalYear,
    raiseRates: raiseRates(
      inputs.raiseTerms.terms,
      firstSavingsYear(projection.fiscalYears, censusFiscalYear),
    ),
  })
  return {
    year,
    censusDate,
    fiscalYear,
    period: budget.period,
    headlines: headlineFigures({
      records,
      budget,
      projection,
      censusFiscalYear,
    }),
    answers: answers.map(({ rules, ...answer }) => answer),
    areas: areaFigures(census, budget),
    bases: placementBases(census),
    topPaid: topPaidJobs({ year, records }, TOP_PAID_COUNT),
  }
}

function summarizePeople(falls: FallYear[]): Summary['people'] {
  return {
    names: indexPeople(falls).map((person) => ({
      name: person.name,
      runs: person.runs.map((run) => run.years.map(({ year }) => year)),
      possibleStudent: personYearsOf(person).some(({ records }) =>
        records.some((record) => record.possibleStudent),
      ),
    })),
    medians: Object.fromEntries(peerMedians(falls)),
  }
}

/** The figures the pages show by default, derived as the pages derive them; `scopes` is `buildTrendScopes` of the same inputs. */
export function buildSummary(
  inputs: SummaryInputs,
  scopes: TrendScopes,
): Summary {
  const years = latestYears(inputs)
  return {
    trends: summarizeTrends(inputs, scopes),
    departments: summarizeDepartments(years),
    home: summarizeHome(inputs, years.now),
    people: summarizePeople(inputs.falls),
  }
}
