import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { AREA, budgetRow, scenarioBudget, UNIT } from '@/test/scenario-fixtures'
import { toDepartmentCensus } from './department-jobs'
import { egShares } from './eg-share'

const PAY = { code: UNIT, name: 'CAS Biology' }

test("an area's share is its E&G salary budget over its census pay, capped at 100%", () => {
  const budget = scenarioBudget([
    budgetRow({
      org: UNIT,
      fund: 'EG0001',
      accountType: '61',
      totalExpenditureBudgetCents: 6_000_000,
    }),
    budgetRow({
      org: UNIT,
      fund: 'GF0001',
      accountType: '61',
      totalExpenditureBudgetCents: 9_000_000,
    }),
    budgetRow({
      org: UNIT,
      fund: 'EG0001',
      accountType: '71',
      totalExpenditureBudgetCents: 9_000_000,
    }),
  ])
  const records = [
    unclassifiedJob({ payDepartment: PAY, annualSalaryRateCents: 5_000_000 }),
    classifiedJob({
      payDepartment: PAY,
      annualSalaryRateCents: 4_000_000,
      apptPercent: 50,
    }),
    classifiedJob({
      payDepartment: PAY,
      positionClass: { code: 'TS901', title: null },
    }),
  ]
  const census = toDepartmentCensus({ year: 2025, records }, budget)
  // 6,000,000 / (5,000,000 + 2,000,000) = 85.714%; the temporary is left out.
  expect(egShares(census, budget)).toEqual(new Map([[AREA, 8_571]]))

  const rich = scenarioBudget([
    budgetRow({
      org: AREA,
      fund: 'EG0001',
      accountType: '63',
      totalExpenditureBudgetCents: 99_000_000,
    }),
  ])
  expect(
    egShares(toDepartmentCensus({ year: 2025, records }, rich), rich),
  ).toEqual(new Map([[AREA, 10_000]]))
})
