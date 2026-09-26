import { z } from 'zod'
import type { BudgetRow, BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import type { Manifest } from '../data/manifest.ts'
import type { OpeRates } from '../data/ope.ts'
import type { Projection } from '../data/outlook.ts'
import { type AreaAssignment, listAreas } from './areas.ts'
import { sumBy } from './department-budget.ts'
import { placeDepartments } from './department-index.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { unitSum } from './department-table.ts'
import { egShares } from './eg-share.ts'
import { isClassifiedTemp, summarize, UNASSIGNED_AREA } from './overview.ts'
import type { Rule } from './scenario.ts'
import { SCENARIO_EXAMPLES } from './scenario-examples.ts'
import {
  firstSavingsYear,
  projectScenario,
  yearlySavings,
} from './scenario-outlook.ts'
import { measureJobs } from './trends.ts'

/** The projection's run rate in the first projected year after the census. */
function runRateAfter(projection: Projection, censusFiscalYear: number) {
  const fiscalYear = firstSavingsYear(projection.fiscalYears, censusFiscalYear)
  const cents =
    projection.runRateCents[projection.fiscalYears.indexOf(fiscalYear)] ?? 0
  return { fiscalYear, cents }
}

export type HeadlineFigures = {
  runRate: { fiscalYear: number; cents: number }
  budgetCents: number
  spendCents: number
  people: number
}

/** The run rate after the census as published, the budget's Total Expenditure summed over every row, and the census's spend and people. */
export function headlineFigures(options: {
  records: FallRecord[]
  budget: BudgetYear
  projection: Projection
  censusFiscalYear: number
}): HeadlineFigures {
  const { records, budget } = options
  return {
    runRate: runRateAfter(options.projection, options.censusFiscalYear),
    budgetCents: budget.rows.reduce(
      (sum, row) => sum + row.totalExpenditureBudgetCents,
      0,
    ),
    spendCents: summarize(records.filter((record) => !isClassifiedTemp(record)))
      .spendCents,
    people: summarize(records).people,
  }
}

const HOME_EXAMPLE_COUNT = 2

/** The scenario examples the home page answers; each is census rules only, so no history, raise rate, or elimination budget is read. */
export const HOME_EXAMPLES = SCENARIO_EXAMPLES.slice(0, HOME_EXAMPLE_COUNT)

export type ExampleAnswer = {
  question: string
  rules: Rule[]
  fiscalYear: number
  savingsCents: number
  /** The savings over the year's projected shortfall; `null` when the run rate is not negative. */
  gapShare: number | null
}

/** Each home example's E&G savings in the first projected year after the census, as `/scenarios` computes them. */
export function exampleAnswers(options: {
  census: DepartmentCensus
  budget: BudgetYear
  rates: OpeRates
  projection: Projection
  censusFiscalYear: number
}): ExampleAnswer[] {
  const { census, budget, projection, censusFiscalYear } = options
  const shares = egShares(census, budget)
  const runRate = runRateAfter(projection, censusFiscalYear)
  return HOME_EXAMPLES.map(({ question, rules }) => {
    const result = projectScenario({
      census,
      censusFiscalYear,
      rules,
      rates: options.rates,
      egShares: shares,
      history: [],
      fiscalYears: projection.fiscalYears,
      eliminationBudget: budget,
      raiseRates: [],
    })
    const [savingsCents = 0] = yearlySavings(result, {
      years: 1,
      firstFiscalYear: runRate.fiscalYear,
    })
    return {
      question,
      rules,
      fiscalYear: runRate.fiscalYear,
      savingsCents,
      gapShare: runRate.cents < 0 ? savingsCents / -runRate.cents : null,
    }
  })
}

/** Job records published per Fall census, oldest first, from the manifest's file counts. */
export function jobsByCensus(
  manifest: Manifest,
): { year: number; jobs: number }[] {
  return [...manifest.fall]
    .sort((a, b) => a.year - b.year)
    .map(({ year, files }) => ({
      year,
      jobs: files.reduce((sum, file) => sum + file.records, 0),
    }))
}

export type AreaFigure = {
  /** `null` only for the jobs placed in no area. */
  code: string | null
  name: string
  /** `null` for the jobs placed in no area. */
  budgetCents: number | null
  jobs: number
  spendCents: number | null
}

/** Each area's budget and census jobs and spend, as the departments table figures them, and how the census's jobs were placed. */
export function areaFigures(
  census: DepartmentCensus,
  budget: BudgetYear,
): {
  areas: AreaFigure[]
  bases: Record<AreaAssignment['basis'], number>
} {
  const totals = sumBy(budget.rows, (row: BudgetRow) => row.org)
  const { areaJobs } = placeDepartments(census)
  const figure = (code: string | null, name: string): AreaFigure => {
    const { jobs, spendCents } = measureJobs(areaJobs.get(code) ?? [])
    return {
      code,
      name,
      budgetCents: unitSum(code, budget.orgs, totals),
      jobs,
      spendCents,
    }
  }
  const areas = listAreas(census.orgs).map(({ code, name }) =>
    figure(code, name),
  )
  if (areaJobs.has(null)) areas.push(figure(null, UNASSIGNED_AREA))
  const bases = { published: 0, name: 0, hand: 0, unassigned: 0 }
  for (const record of census.records) bases[census.assign(record).basis] += 1
  return { areas, bases }
}

/** The jobs with the highest published annual salary rates, ties by name; classified temporaries and possible students are left out. */
export function topPaidJobs(
  records: FallRecord[],
  count: number,
): FallRecord[] {
  return records
    .filter((record) => !isClassifiedTemp(record) && !record.possibleStudent)
    .sort(
      (a, b) =>
        b.annualSalaryRateCents - a.annualSalaryRateCents ||
        a.name.localeCompare(b.name),
    )
    .slice(0, count)
}

export const HOME_MEASURES = ['budget', 'spend', 'jobs'] as const
export type HomeMeasure = (typeof HOME_MEASURES)[number]

/** The home page's URL search params; a malformed measure falls back to the budget. */
export const homeSearchSchema = z.object({
  measure: z.enum(HOME_MEASURES).optional().catch(undefined),
})

const MEASURE_VALUES: Record<HomeMeasure, (area: AreaFigure) => number | null> =
  {
    budget: (area) => area.budgetCents,
    spend: (area) => area.spendCents,
    jobs: (area) => area.jobs,
  }

/** The `count` areas with the largest values for the measure, largest first, ties by name; an area without a value is left out. */
export function areaBars(
  areas: AreaFigure[],
  measure: HomeMeasure,
  count: number,
): (AreaFigure & { value: number })[] {
  return areas
    .flatMap((area) => {
      const value = MEASURE_VALUES[measure](area)
      return value === null ? [] : [{ ...area, value }]
    })
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, count)
}
