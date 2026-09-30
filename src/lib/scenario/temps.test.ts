import { expect, test } from 'vitest'
import { TEMPS_GROUP } from '@/lib/census/groups'
import { toDepartmentCensus } from '@/lib/departments/jobs'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import {
  AREA,
  budgetRow,
  censusSavings,
  RATES,
  scenarioBudget,
  tempsUnit,
  UNIT,
} from '@/test/scenario-fixtures'
import { egShares } from './eg-share'
import { ANY_SCOPE, type Rule, runScenario } from './scenario'

const PAY = { code: UNIT, name: 'CAS Biology' }
const RESEARCH = '600000'
const TEMPS = { ...ANY_SCOPE, group: TEMPS_GROUP }

const RECORDS = [
  unclassifiedJob({
    payDepartment: PAY,
    eeoCategory: 'Other Professionals',
    termOfServiceMonths: 12,
    annualSalaryRateCents: 10_000_000,
  }),
  classifiedJob({
    payDepartment: PAY,
    positionClass: { code: 'TS901', title: null },
  }),
]
const LINES = [
  tempsUnit({ jobs: 4, payCents: 2_000_000 }),
  tempsUnit({ code: AREA, jobs: 1, payCents: 1_000_000 }),
  tempsUnit({ code: '631000', area: RESEARCH, jobs: 2, payCents: 500_000 }),
]
// The area's 6,500,000 of E&G salaries over 10,000,000 of census pay and 3,000,000 of temporaries' pay is 50%; Research has none.
const BUDGET = scenarioBudget([
  budgetRow({
    org: UNIT,
    fund: 'EG0001',
    accountType: '61',
    totalExpenditureBudgetCents: 6_500_000,
  }),
])
const CENSUS = toDepartmentCensus({ year: 2025, records: RECORDS }, BUDGET)
const SHARES = egShares(CENSUS, BUDGET, LINES)

function run(
  rules: Rule[],
  projectedYears = 0,
  overrides: Partial<Parameters<typeof runScenario>[0]> = {},
) {
  return runScenario({
    census: CENSUS,
    temps: LINES,
    rules,
    rates: RATES,
    egShares: SHARES,
    opeFiscalYear: 2026,
    history: [],
    projectedYears,
    eliminationBudget: BUDGET,
    raiseRates: [],
    ...overrides,
  })
}

test("the base counts each unit's temporaries at their FY pay and FY jobs, and the E&G share counts their pay", () => {
  const result = run([])
  expect(SHARES).toEqual(
    new Map([
      [AREA, 5_000],
      [RESEARCH, 0],
    ]),
  )
  expect(result.temps).toEqual({ jobs: 7, payCents: 3_500_000 })
  // The job: 10,000,000 x 0.9 x 1.7; the temporaries: 3,500,000 x 0.98 x 1.3.
  expect(result.base).toEqual({
    jobs: 8,
    salaryCents: 13_500_000,
    fullCostCents: 15_300_000 + 4_459_000,
    egCents: 7_650_000 + 1_911_000,
  })
})

test('a removal takes the temporaries in scope, a cut scales their pay, and a threshold leaves it', () => {
  expect(
    censusSavings(
      run([
        {
          kind: 'threshold',
          scope: ANY_SCOPE,
          overCents: 0,
          cutBasisPoints: 10_000,
        },
        { kind: 'cut', scope: ANY_SCOPE, cutBasisPoints: 1_000 },
        { kind: 'remove', scope: TEMPS },
      ]),
    ),
  ).toEqual([
    {
      jobs: 1,
      salaryCents: 10_000_000,
      fullCostCents: 15_300_000,
      egCents: 7_650_000,
    },
    { jobs: 7, salaryCents: 350_000, fullCostCents: 445_900, egCents: 191_100 },
    // 90% of what the cut left: 3,150,000 x 1.274, and 2,700,000 of it at 50%.
    {
      jobs: 7,
      salaryCents: 3_150_000,
      fullCostCents: 4_013_100,
      egCents: 1_719_900,
    },
  ])
})

test("a department reaches a unit's temporaries by its code and an area's by its area; a term or unclassified scope reaches none", () => {
  const removedJobs = (scope: typeof ANY_SCOPE) =>
    censusSavings(run([{ kind: 'remove', scope }]))[0]?.jobs
  expect(removedJobs({ ...ANY_SCOPE, dept: UNIT })).toBe(5)
  expect(removedJobs({ ...ANY_SCOPE, dept: AREA })).toBe(6)
  expect(removedJobs({ ...ANY_SCOPE, dept: '631000' })).toBe(2)
  expect(removedJobs({ ...ANY_SCOPE, term: 12 })).toBe(1)
  expect(removedJobs({ ...ANY_SCOPE, kind: 'unclassified' })).toBe(1)
  expect(removedJobs({ ...ANY_SCOPE, group: 'Faculty' })).toBe(0)
})

test("an elimination takes its units' temporaries from later rules and counts its census temporaries", () => {
  const result = run([
    { kind: 'eliminate', code: UNIT },
    { kind: 'remove', scope: TEMPS },
  ])
  expect(result.rules[0]).toMatchObject({ jobs: 2, isPartlyMatched: false })
  expect(censusSavings(result)[1]).toMatchObject({
    jobs: 3,
    salaryCents: 1_500_000,
  })
})

test('temporaries grow at 3% a year, and a raise freeze saves that 3%', () => {
  const removal = run([{ kind: 'remove', scope: TEMPS }], 1)
  // 1,911,000 of E&G a year at 3%.
  expect(removal.censusEgByYear).toEqual([1_968_330])
  const [raises] = run(
    [{ kind: 'raises', scope: TEMPS, years: 1, capBasisPoints: 0 }],
    1,
  ).rules
  expect(raises).toEqual({
    kind: 'raises',
    byYear: [
      {
        jobs: 7,
        salaryCents: 105_000,
        fullCostCents: 133_770,
        egCents: 57_330,
      },
    ],
  })
})

test("a hiring freeze holds a scope's temporaries at the rate measured over its other jobs", () => {
  const job = (name: string, annualSalaryRateCents: number) =>
    classifiedJob({ name, payDepartment: PAY, annualSalaryRateCents })
  const history = [
    toDepartmentCensus(
      {
        year: 2024,
        records: [job('Avila', 4_000_000), job('Brown', 6_000_000)],
      },
      BUDGET,
    ),
    toDepartmentCensus(
      { year: 2025, records: [job('Avila', 4_000_000)] },
      BUDGET,
    ),
  ]
  const [census] = history.slice(-1)
  if (!census) throw new Error('The test history has no 2025 census')
  const freezeOver = (scope: typeof ANY_SCOPE) =>
    run([{ kind: 'freeze', scope, years: 1, afterFreeze: 'refill' }], 1, {
      census,
      history,
      temps: [tempsUnit({ jobs: 5 })],
      egShares: new Map([[AREA, 10_000]]),
    }).rules[0]
  // 60% turnover. Avila: 4,000,000 x 0.9 x 1.9 x 1.03 x 0.6; the temporaries: 1,000,000 x 0.98 x 1.3 x 1.03 x 0.6.
  expect(freezeOver({ ...ANY_SCOPE, kind: 'classified' })).toMatchObject({
    rateBasisPoints: 6_000,
    byYear: [{ jobs: 4, egCents: 4_227_120 + 787_332 }],
  })
  expect(freezeOver(TEMPS)).toMatchObject({
    rateBasisPoints: 0,
    byYear: [{ jobs: 0, egCents: 0 }],
  })
})
