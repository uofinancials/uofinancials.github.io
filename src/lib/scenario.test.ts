import { expect, test } from 'vitest'
import { ANY_SCOPE } from '@/lib/scenario'
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
import { egShares } from './eg-share'
import { type Rule, runScenario, type ScenarioScope } from './scenario'

const PAY = { code: UNIT, name: 'CAS Biology' }
const CLASSIFIED: ScenarioScope = { ...ANY_SCOPE, kind: 'classified' }

const RECORDS = [
  unclassifiedJob({
    payDepartment: PAY,
    eeoCategory: 'Other Professionals',
    termOfServiceMonths: 12,
    annualSalaryRateCents: 20_000_000,
  }),
  classifiedJob({ payDepartment: PAY, annualSalaryRateCents: 5_000_000 }),
  unclassifiedJob({ payDepartment: PAY, annualSalaryRateCents: 10_000_000 }),
  classifiedJob({
    payDepartment: PAY,
    positionClass: { code: 'TS901', title: null },
  }),
]
// Half of the 35,000,000 census pay is E&G, so every job's share is 50%.
const BUDGET = scenarioBudget([
  budgetRow({
    org: UNIT,
    fund: 'EG0001',
    accountType: '61',
    totalExpenditureBudgetCents: 17_500_000,
  }),
])
const CENSUS = toDepartmentCensus({ year: 2025, records: RECORDS }, BUDGET)
const SHARES = egShares(CENSUS, BUDGET)

function run(rules: Rule[], opeFiscalYear = 2026) {
  return runScenario({
    census: CENSUS,
    rules,
    rates: RATES,
    egShares: SHARES,
    opeFiscalYear,
    history: [],
    projectedYears: 0,
    eliminationBudget: null,
  })
}

test('the base is every job but temporaries, at salary x (1 - leave) x (1 + OPE), weighted by E&G share', () => {
  const result = run([])
  // A: 20,000,000 x 0.9 x 1.7; B: 5,000,000 x 0.9 x 1.9; C (9-month faculty): 10,000,000 x 0.99 x 1.5.
  expect(result.base).toEqual({
    jobs: 3,
    salaryCents: 35_000_000,
    fullCostCents: 30_600_000 + 8_550_000 + 14_850_000,
    egCents: 27_000_000,
  })
  expect(result.temporaries).toBe(1)
  expect(result.opeFiscalYear).toBe(2026)
  expect(result.leaveFiscalYear).toBe(2027)
  expect(SHARES.get(AREA)).toBe(5_000)
})

test('rules apply in order to what earlier rules left, and sum to the total', () => {
  const result = run([
    {
      kind: 'threshold',
      scope: ANY_SCOPE,
      overCents: 15_000_000,
      cutBasisPoints: 10_000,
    },
    { kind: 'cut', scope: ANY_SCOPE, cutBasisPoints: 1_000 },
    { kind: 'remove', scope: CLASSIFIED },
    { kind: 'remove', scope: CLASSIFIED },
  ])
  expect(censusSavings(result)).toEqual([
    {
      jobs: 1,
      salaryCents: 5_000_000,
      fullCostCents: 7_650_000,
      egCents: 3_825_000,
    },
    // 10% of 15,000,000, 5,000,000, and 10,000,000.
    {
      jobs: 3,
      salaryCents: 3_000_000,
      fullCostCents: 4_635_000,
      egCents: 2_317_500,
    },
    // The classified job at its cut rate, 4,500,000 x 0.9 x 1.9.
    {
      jobs: 1,
      salaryCents: 4_500_000,
      fullCostCents: 7_695_000,
      egCents: 3_847_500,
    },
    { jobs: 0, salaryCents: 0, fullCostCents: 0, egCents: 0 },
  ])
  expect(result.total).toEqual({
    jobs: 5,
    salaryCents: 12_500_000,
    fullCostCents: 19_980_000,
    egCents: 9_990_000,
  })
})

test('a threshold cuts only the part above it, and leaves jobs at or under it uncounted', () => {
  const [halved] = censusSavings(
    run([
      {
        kind: 'threshold',
        scope: ANY_SCOPE,
        overCents: 10_000_000,
        cutBasisPoints: 5_000,
      },
    ]),
  )
  // Only A is over: half of its 10,000,000 above the threshold.
  expect(halved).toEqual({
    jobs: 1,
    salaryCents: 5_000_000,
    fullCostCents: 7_650_000,
    egCents: 3_825_000,
  })
})

test('with no OPE rate for the year, full cost is null and the E&G share weights salary', () => {
  const result = run([{ kind: 'remove', scope: CLASSIFIED }], 2019)
  expect(result.opeFiscalYear).toBeNull()
  expect(censusSavings(result)).toEqual([
    {
      jobs: 1,
      salaryCents: 5_000_000,
      fullCostCents: null,
      egCents: 2_500_000,
    },
  ])
})

test('full cost is exact past 2^53 and rounds half up to the cent', () => {
  const coach = unclassifiedJob({
    payDepartment: PAY,
    eeoCategory: 'Coaches',
    termOfServiceMonths: 12,
    annualSalaryRateCents: 123_456_789,
  })
  const budget = scenarioBudget([])
  const census = toDepartmentCensus({ year: 2025, records: [coach] }, budget)
  const rates = {
    ...RATES,
    opeRates: [
      {
        fiscalYear: 2027,
        group: 'Faculty/Staff A',
        basisPoints: 7_740,
        source: 'current' as const,
      },
    ],
    leaveRates: [
      {
        fiscalYear: 2027,
        group: 'Faculty/Staff A',
        appliesTo: null,
        basisPoints: 1_067,
      },
    ],
  }
  const { base } = runScenario({
    census,
    rules: [],
    rates,
    egShares: new Map(),
    opeFiscalYear: 2027,
    history: [],
    projectedYears: 0,
    eliminationBudget: null,
  })
  // 123,456,789 x 8,933 x 17,740 = 19,564,372,661,470,380, over 10^8.
  expect(base.fullCostCents).toBe(195_643_727)
  expect(base.egCents).toBe(0)
})
