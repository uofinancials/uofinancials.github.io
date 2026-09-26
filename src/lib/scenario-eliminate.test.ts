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
import { eliminationFiscalYear, eliminationOptions } from './scenario-eliminate'
import { eliminationRows, totalEgCents } from './scenario-labels'

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
    isCovered: false,
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
    { jobs: 0, egCents: 0, allFundsCents: 0, isCovered: true },
    { jobs: 0, egCents: 0, allFundsCents: 0, isCovered: true },
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

test('a covered unit carries no partial-match note, since the area took its census jobs', () => {
  const [, math] = run([eliminate(AREA), eliminate(MATH)]).rules
  expect(math).toMatchObject({ isCovered: true, isPartlyMatched: false })
})

test('eliminations use the first savings year budget, or the latest before it', () => {
  expect(eliminationFiscalYear([2025, 2026, 2027], 2027)).toBe(2027)
  expect(eliminationFiscalYear([2025, 2026], 2027)).toBe(2026)
  expect(() => eliminationFiscalYear([2028], 2027)).toThrow('FY2027')
})

test('the options are each area by name with its units by name', () => {
  expect(eliminationOptions(FY27)).toEqual([
    {
      code: AREA,
      name: 'Arts & Sciences',
      units: [
        { code: UNIT, name: 'CAS Biology' },
        { code: MATH, name: 'CAS Mathematics' },
      ],
    },
  ])
})

test('elimination rows keep their stack position, and the total adds them to the census rules', () => {
  const result = run([
    { kind: 'cut', scope: ANY_SCOPE, cutBasisPoints: 1_000 },
    eliminate(MATH),
  ])
  expect(eliminationRows(result).map(({ position }) => position)).toEqual([2])
  expect(totalEgCents(result)).toBe(result.total.egCents + 7_800_000)
})
