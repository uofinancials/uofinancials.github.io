import type { BudgetYear } from '../data/budget.ts'
import { censusYearOf, type FallYear } from '../data/fall.ts'
import type { Manifest } from '../data/manifest.ts'
import type { OpeRates } from '../data/ope.ts'
import type { Outlook } from '../data/outlook.ts'
import type { RaiseTerms } from '../data/raises.ts'
import type { Summary } from '../data/summary.ts'
import { listAreas } from './areas.ts'
import { toDepartmentCensus } from './department-jobs.ts'
import {
  areaFigures,
  departmentRows,
  selectTableSources,
} from './department-table.ts'
import {
  exampleAnswers,
  headlineFigures,
  placementBases,
  TOP_PAID_COUNT,
  topPaidJobs,
} from './home.ts'
import { fiscalYearOf, selectOverviewSources } from './overview.ts'
import { peerMedians } from './peer-median.ts'
import { indexPeople, personYearsOf } from './person-lookup.ts'
import { firstSavingsYear } from './scenario-outlook.ts'
import { raiseRates } from './scenario-raises.ts'
import { TREND_GROUPS, type TrendGroup } from './trend-groups.ts'
import { buildTrends, type Trends } from './trends.ts'
import { ALL_GROUPS } from './trends-search.ts'

/** The committed data files a summary is derived from. */
export type SummaryInputs = {
  manifest: Manifest
  falls: FallYear[]
  budgets: BudgetYear[]
  outlook: Outlook
  rates: OpeRates
  raiseTerms: RaiseTerms
}

function censusFor(falls: FallYear[], year: number) {
  const fall = falls.find(({ censusDate }) => censusYearOf(censusDate) === year)
  if (!fall) throw new Error(`No Fall ${year} census to summarize`)
  return { year, records: fall.records }
}

function budgetFor(budgets: BudgetYear[], fiscalYear: number): BudgetYear {
  const budget = budgets.find((entry) => entry.fiscalYear === fiscalYear)
  if (!budget) throw new Error(`No FY${fiscalYear} budget to summarize`)
  return budget
}

function summarizeTrends(falls: FallYear[]): Summary['trends'] {
  const censuses = falls.map(({ censusDate, records }) => ({
    year: censusYearOf(censusDate),
    records,
  }))
  const years = censuses.map(({ year }) => year)
  const trendsFor = (group: TrendGroup | null) =>
    buildTrends(censuses, {
      kind: 'all',
      group,
      dept: null,
      position: null,
      jobs: null,
      from: Math.min(...years),
      to: Math.max(...years),
    })
  return Object.fromEntries([
    [ALL_GROUPS, trendsFor(null)],
    ...TREND_GROUPS.map((group) => [group, trendsFor(group)]),
  ])
}

function summarizeDepartments({
  manifest,
  falls,
  budgets,
}: SummaryInputs): Summary['departments'] {
  const { now, before } = selectTableSources(manifest)
  const tableYear = (source: { year: number; fiscalYear: number }) => {
    const budget = budgetFor(budgets, source.fiscalYear)
    const census = toDepartmentCensus(censusFor(falls, source.year), budget)
    return { census, budget }
  }
  const nowYear = tableYear(now)
  return {
    now,
    before,
    areas: listAreas(nowYear.budget.orgs),
    rows: departmentRows(nowYear, tableYear(before)),
  }
}

function summarizeHome(inputs: SummaryInputs): Summary['home'] {
  const { census: entry, fiscalYear } = selectOverviewSources(inputs.manifest)
  const { year, records } = censusFor(inputs.falls, entry.year)
  const budget = budgetFor(inputs.budgets, fiscalYear)
  const [projection] = inputs.outlook.projections
  const censusFiscalYear = fiscalYearOf(entry.censusDate)
  const census = toDepartmentCensus({ year, records }, budget)
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
    fiscalYear,
    headlines: headlineFigures({
      records,
      budget,
      projection,
      censusFiscalYear,
    }),
    answers: answers.map(({ fiscalYear, savingsCents, gapShare }) => ({
      fiscalYear,
      savingsCents,
      gapShare,
    })),
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

/** The figures the pages show by default, derived as the pages derive them. */
export function buildSummary(inputs: SummaryInputs): Summary {
  return {
    trends: summarizeTrends(inputs.falls),
    departments: summarizeDepartments(inputs),
    home: summarizeHome(inputs),
    people: summarizePeople(inputs.falls),
  }
}

/** The years `from` to `to` of full-range trends, dropping lines with no job in them, as `buildTrends` gives that range. */
export function sliceTrends(trends: Trends, from: number, to: number): Trends {
  const isInRange = ({ year }: { year: number }) => year >= from && year <= to
  return {
    series: trends.series
      .map(({ key, points }) => ({ key, points: points.filter(isInRange) }))
      .filter(({ points }) => points.some(({ jobs }) => jobs > 0)),
    total: trends.total.filter(isInRange),
  }
}
