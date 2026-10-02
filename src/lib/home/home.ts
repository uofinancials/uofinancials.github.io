import { z } from 'zod'
import type { BudgetYear } from '../../data/budget.ts'
import type { FallRecord } from '../../data/fall.ts'
import type { FyTempsUnit } from '../../data/fy-temps.ts'
import type { Manifest } from '../../data/manifest.ts'
import type { OpeRates } from '../../data/ope.ts'
import type { Projection } from '../../data/outlook.ts'
import { runRateFor } from '../budget/outlook.ts'
import type { AreaAssignment } from '../census/areas.ts'
import { isClassifiedTemp, summarize, sumSpendCents } from '../census/totals.ts'
import { type DepartmentCensus, placementIndexOf } from '../departments/jobs.ts'
import {
  SIZE_MEASURES,
  type SizeMeasure,
  sizeOf,
} from '../departments/measures.ts'
import type { AreaFigure } from '../departments/table.ts'
import { sortJobs } from '../people/list.ts'
import { egShares } from '../scenario/eg-share.ts'
import { SCENARIO_EXAMPLES } from '../scenario/examples.ts'
import {
  firstSavingsYear,
  projectScenario,
  yearlySavings,
} from '../scenario/outlook.ts'
import type { RaiseRate } from '../scenario/raises.ts'
import type { Rule } from '../scenario/scenario.ts'
import { compareKeys } from '../shared/sort.ts'

/** The projection's run rate in the first projected year after the census. */
function runRateAfter(projection: Projection, censusFiscalYear: number) {
  const fiscalYear = firstSavingsYear(projection.fiscalYears, censusFiscalYear)
  return { fiscalYear, cents: runRateFor(projection, fiscalYear) ?? 0 }
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
  /** Classified temporaries' FY pay for the census, 0 where its fiscal year publishes none. */
  tempsPayCents: number
}): HeadlineFigures {
  const { records, budget } = options
  return {
    runRate: runRateAfter(options.projection, options.censusFiscalYear),
    budgetCents: budget.rows.reduce(
      (sum, row) => sum + row.totalExpenditureBudgetCents,
      0,
    ),
    spendCents:
      sumSpendCents(records.filter((record) => !isClassifiedTemp(record))) +
      options.tempsPayCents,
    people: summarize(records).people,
  }
}

const HOME_EXAMPLE_COUNT = 2

export const TOP_PAID_COUNT = 10

/** The scenario examples the home page answers; each is census rules only, so no history or elimination budget is read. */
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
  /** The first savings year's raise rates. */
  raiseRates: RaiseRate[]
  /** The census's classified temporaries' FY pay by unit. */
  temps: FyTempsUnit[]
}): ExampleAnswer[] {
  const { census, budget, projection, censusFiscalYear, temps } = options
  const shares = egShares(census, budget, temps)
  const runRate = runRateAfter(projection, censusFiscalYear)
  return HOME_EXAMPLES.map(({ question, rules }) => {
    const result = projectScenario({
      census,
      temps,
      censusFiscalYear,
      rules,
      rates: options.rates,
      egShares: shares,
      history: [],
      fiscalYears: projection.fiscalYears,
      eliminationBudget: budget,
      raiseRates: options.raiseRates,
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

/** The summary's answers with the rules of the home examples they answer. */
export function answersOf(
  answers: Omit<ExampleAnswer, 'rules'>[],
): ExampleAnswer[] {
  return answers.flatMap((answer) => {
    const example = HOME_EXAMPLES.find(
      ({ question }) => question === answer.question,
    )
    return example ? [{ ...answer, rules: example.rules }] : []
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

/** How each of a census's jobs was placed in an area. */
export function placementBases(
  census: DepartmentCensus,
): Record<AreaAssignment['basis'], number> {
  const { byArea, unassigned } = placementIndexOf(census)
  const bases = {
    published: 0,
    name: 0,
    hand: 0,
    unassigned: unassigned.length,
  }
  for (const { bases: placed } of byArea.values()) {
    bases.published += placed.published
    bases.name += placed.name
    bases.hand += placed.hand
  }
  return bases
}

/** The jobs with the highest published annual salary rates, ties by name. */
export function topPaidJobs(
  census: { year: number; records: FallRecord[] },
  count: number,
): FallRecord[] {
  const { year, records } = census
  return sortJobs(records, { sort: 'rate', dir: 'desc', year }).slice(0, count)
}

/** The home page's URL search params; a malformed measure falls back to the budget. */
export const homeSearchSchema = z.object({
  measure: z.enum(SIZE_MEASURES).optional().catch(undefined),
})

/** The `count` areas with the largest values for the measure, largest first, ties by name; an area without a value is left out. */
export function areaBars(
  areas: AreaFigure[],
  measure: SizeMeasure,
  count: number,
): (AreaFigure & { value: number })[] {
  return areas
    .flatMap((area) => {
      const value = sizeOf(area, measure)
      return value === null ? [] : [{ ...area, value }]
    })
    .sort((a, b) => b.value - a.value || compareKeys(a.name, b.name))
    .slice(0, count)
}
