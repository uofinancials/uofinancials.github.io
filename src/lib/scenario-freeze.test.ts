import { expect, test } from 'vitest'
import type { FallRecord } from '@/data/fall'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { AREA, RATES, scenarioBudget, UNIT } from '@/test/scenario-fixtures'
import { toDepartmentCensus } from './department-jobs'
import { type Rule, runScenario, type ScenarioScope } from './scenario'
import { departureRate, type FreezeRule, freezeShare } from './scenario-freeze'

const PAY = { code: UNIT, name: 'CAS Biology' }
const CLASSIFIED: ScenarioScope = {
  group: null,
  kind: 'classified',
  term: null,
  position: null,
  dept: null,
}
const BUDGET = scenarioBudget([])

const job = (name: string, annualSalaryRateCents: number) =>
  classifiedJob({ name, payDepartment: PAY, annualSalaryRateCents })
const censusOf = (year: number, records: FallRecord[]) =>
  toDepartmentCensus({ year, records }, BUDGET)

// 2023 to 2024: Brown's 6,000,000 of 10,000,000 leaves (60%); 2024 to 2025: Cruz's 4,000,000 of 8,000,000 (50%).
const HISTORY = [
  censusOf(2023, [job('Avila', 4_000_000), job('Brown', 6_000_000)]),
  censusOf(2024, [job('Avila', 4_000_000), job('Cruz', 4_000_000)]),
  censusOf(2025, [
    job('Avila', 4_000_000),
    unclassifiedJob({ name: 'Diaz', payDepartment: PAY }),
  ]),
]
const [, , CENSUS] = HISTORY

function freeze(overrides: Partial<FreezeRule> = {}): FreezeRule {
  return {
    kind: 'freeze',
    scope: CLASSIFIED,
    years: 2,
    afterFreeze: 'refill',
    ...overrides,
  }
}

function run(rules: Rule[]) {
  if (!CENSUS) throw new Error('The test history has no 2025 census')
  return runScenario({
    census: CENSUS,
    rules,
    rates: RATES,
    egShares: new Map([[AREA, 10_000]]),
    opeFiscalYear: 2026,
    history: HISTORY,
    projectedYears: 4,
  })
}

test("the departure rate is the mean share of the scope's spend whose names leave", () => {
  expect(departureRate(HISTORY, CLASSIFIED)).toBe(5_500)
  expect(departureRate(HISTORY.slice(0, 1), CLASSIFIED)).toBe(0)
})

test('a freeze compounds while it lasts, then refills or holds its last share', () => {
  expect([1, 2, 3].map((year) => freezeShare(freeze(), 5_500, year))).toEqual([
    5_500, 7_975, 0,
  ])
  expect(
    [2, 3, 5].map((year) =>
      freezeShare(freeze({ afterFreeze: 'eliminate' }), 5_500, year),
    ),
  ).toEqual([7_975, 7_975, 7_975])
})

test("a freeze saves its share of the scope's cost each year, and saves nothing in the census rules", () => {
  const result = run([freeze()])
  expect(result.rules).toEqual([
    { jobs: 0, salaryCents: 0, fullCostCents: 0, egCents: 0 },
  ])
  // Avila's full cost is 4,000,000 x 0.9 x 1.9 = 6,840,000, all of it E&G.
  expect(result.freezes).toEqual([
    {
      rule: 0,
      rateBasisPoints: 5_500,
      byYear: [
        {
          jobs: 1,
          salaryCents: 2_200_000,
          fullCostCents: 3_762_000,
          egCents: 3_762_000,
        },
        {
          jobs: 1,
          salaryCents: 3_190_000,
          fullCostCents: 5_454_900,
          egCents: 5_454_900,
        },
        { jobs: 0, salaryCents: 0, fullCostCents: 0, egCents: 0 },
        { jobs: 0, salaryCents: 0, fullCostCents: 0, egCents: 0 },
      ],
    },
  ])
})

test('a freeze applies after every other rule, and a second freeze to what the first left', () => {
  const result = run([
    freeze({ years: 1 }),
    { kind: 'cut', scope: CLASSIFIED, cutBasisPoints: 5_000 },
    freeze({ years: 1 }),
  ])
  const [first, second] = result.freezes
  // After the cut, Avila's rate is 2,000,000: 55% of it, then 55% of the 45% left.
  expect(first?.byYear[0]?.salaryCents).toBe(1_100_000)
  expect(second?.byYear[0]?.salaryCents).toBe(495_000)
  expect(result.total.salaryCents).toBe(2_000_000)
})
