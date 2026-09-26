import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import {
  AREA,
  budgetRow,
  censusSavings,
  RATES,
  scenarioBudget,
  UNIT,
} from '@/test/scenario-fixtures'
import { toDepartmentCensus } from './department-jobs'
import { ANY_SCOPE, type Rule, runScenario } from './scenario'

const MATH = '223501'
const BIOLOGY = { code: UNIT, name: 'CAS Biology' }

const RECORDS = [
  unclassifiedJob({
    payDepartment: BIOLOGY,
    annualSalaryRateCents: 10_000_000,
  }),
  classifiedJob({ payDepartment: BIOLOGY, annualSalaryRateCents: 5_000_000 }),
  // Filed under a code the budget does not use; placed in the area by its name.
  unclassifiedJob({
    payDepartment: { code: '223500', name: 'CAS Mathematics Operations' },
    annualSalaryRateCents: 20_000_000,
  }),
]
const CENSUS = toDepartmentCensus(
  { year: 2025, records: RECORDS },
  scenarioBudget([]),
)

const line = (
  org: string,
  accountType: string,
  cents: number,
  fund = 'EG0001',
) => budgetRow({ org, fund, accountType, totalExpenditureBudgetCents: cents })

const FY27: BudgetYear = {
  ...scenarioBudget([
    line(UNIT, '61', 12_000_000),
    line(UNIT, '69', 6_000_000),
    line(UNIT, '71', 1_000_000),
    line(UNIT, '71', 500_000, 'GF0001'),
    line(UNIT, '74', 7_777),
    line(UNIT, '89', 9_999),
    line(MATH, '61', 8_000_000),
    line(MATH, '71', -200_000),
  ]),
  fiscalYear: 2027,
  period: '02',
}
FY27.orgs[MATH] = { name: 'CAS Mathematics', level: 5, parent: AREA }

function run(rules: Rule[]) {
  return runScenario({
    census: CENSUS,
    rules,
    rates: RATES,
    egShares: new Map([[AREA, 10_000]]),
    opeFiscalYear: 2026,
    history: [],
    projectedYears: 0,
    eliminationBudget: FY27,
  })
}

const eliminate = (code: string): Rule => ({ kind: 'eliminate', code })

test('a unit saves its pay, OPE, and S&S lines, E&G by fund type 11, leaving out aid and reserves', () => {
  const [biology] = run([eliminate(UNIT)]).rules
  expect(biology).toEqual({
    kind: 'eliminate',
    code: UNIT,
    name: 'CAS Biology',
    isArea: false,
    jobs: 2,
    eg: { payCents: 12_000_000, opeCents: 6_000_000, servicesCents: 1_000_000 },
    egCents: 19_000_000,
    allFundsCents: 19_500_000,
    isPartlyMatched: false,
  })
})

test('a unit whose census pay is under half its budgeted salaries is partly matched, and a negative line reduces savings', () => {
  const [math] = run([eliminate(MATH)]).rules
  expect(math).toMatchObject({
    jobs: 0,
    eg: { payCents: 8_000_000, opeCents: 0, servicesCents: -200_000 },
    egCents: 7_800_000,
    allFundsCents: 7_800_000,
    isPartlyMatched: true,
  })
})

test('an area saves every unit in it once, and a unit inside it or a repeat saves nothing more', () => {
  const result = run([eliminate(AREA), eliminate(UNIT), eliminate(AREA)])
  expect(result.rules).toMatchObject([
    { isArea: true, jobs: 3, egCents: 26_800_000, allFundsCents: 27_300_000 },
    { jobs: 0, egCents: 0, allFundsCents: 0, isPartlyMatched: false },
    { jobs: 0, egCents: 0, allFundsCents: 0 },
  ])
  expect(result.eliminated).toEqual({
    egCents: 26_800_000,
    allFundsCents: 27_300_000,
    fiscalYear: 2027,
  })
  expect(result.total.jobs).toBe(0)
})

test('an elimination applies before every other rule, whatever the order', () => {
  const result = run([
    { kind: 'cut', scope: ANY_SCOPE, cutBasisPoints: 1_000 },
    eliminate(UNIT),
    { kind: 'remove', scope: ANY_SCOPE },
  ])
  // Only the Mathematics job is left to the cut: 10% of 20,000,000.
  const [cut, , removed] = censusSavings(result)
  expect(cut).toMatchObject({ jobs: 1, salaryCents: 2_000_000 })
  expect(removed).toMatchObject({ jobs: 1, salaryCents: 18_000_000 })
  expect(result.base.jobs).toBe(3)
  expect(result.total.salaryCents).toBe(20_000_000)
  expect(result.eliminated?.egCents).toBe(19_000_000)
})

test('with no elimination budget there is no eliminated total, and an elimination cannot run', () => {
  const options = {
    census: CENSUS,
    rates: RATES,
    egShares: new Map(),
    opeFiscalYear: 2026,
    history: [],
    projectedYears: 0,
    eliminationBudget: null,
  }
  expect(runScenario({ ...options, rules: [] }).eliminated).toBeNull()
  expect(() => runScenario({ ...options, rules: [eliminate(UNIT)] })).toThrow(
    'no budget year',
  )
})
