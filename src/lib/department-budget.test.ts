import { expect, test } from 'vitest'
import type { BudgetRow, BudgetYear } from '@/data/budget'
import { departmentBudget } from './department-budget'

const AREA = '222000'
const UNIT = '223100'
const OTHER_AREA = '600000'
const MOVED = '631200'

function row(
  org: string,
  accountType: string,
  cents: number,
  fund = 'F00001',
): BudgetRow {
  return {
    period: '01',
    org,
    fund,
    accountType,
    beginningBudgetCents: cents,
    permAdjustmentsCents: 0,
    permStrategicInitiativeCents: 0,
    totalPermBudgetCents: cents,
    carryForwardCents: 0,
    tempBudgetCents: 0,
    tempStrategicInitiativeCents: 0,
    totalTempBudgetCents: 0,
    totalExpenditureBudgetCents: cents,
  }
}

function budget(
  fiscalYear: number,
  movedParent: string,
  rows: BudgetRow[],
): BudgetYear {
  return {
    fiscalYear,
    period: fiscalYear === 2027 ? '02' : '14',
    orgs: {
      [AREA]: { name: 'Arts & Sciences', level: 3, parent: null },
      [OTHER_AREA]: { name: 'Research', level: 3, parent: null },
      [UNIT]: { name: 'CAS Biology', level: 5, parent: AREA },
      [MOVED]: { name: 'Neuroscience', level: 5, parent: movedParent },
    },
    funds: {
      F00001: { name: 'General', fundType: '11', fundGroup: '10' },
      F00002: { name: 'Gift', fundType: '36', fundGroup: '30' },
    },
    fundTypes: { '11': 'Budgeted Operations', '36': 'Gift Funds - Restricted' },
    accountTypes: {
      '61': 'Unclassified Salaries',
      '69': 'OPE',
      '89': 'Reserves',
    },
    rows,
  }
}

const BUDGETS = [
  budget(2027, OTHER_AREA, [row(UNIT, '61', 500), row(MOVED, '61', 70)]),
  budget(2026, AREA, [
    row(UNIT, '61', 1_000),
    row(UNIT, '69', 400),
    row(UNIT, '69', -100),
    row(UNIT, '89', 250, 'F00002'),
    row(MOVED, '61', 30),
    row(OTHER_AREA, '61', 9_999),
  ]),
]

test('a unit sums its own rows per account group and year', () => {
  const unit = departmentBudget(UNIT, BUDGETS, 'account')
  expect(unit.years).toEqual([
    { fiscalYear: 2026, period: '14' },
    { fiscalYear: 2027, period: '02' },
  ])
  expect(unit.series).toEqual([
    { key: 'Salaries and pay', values: [1_000, 500] },
    { key: 'OPE and benefits', values: [300, 0] },
    { key: 'Reimbursements, transfers, and reserves', values: [250, 0] },
  ])
  expect(unit.total).toEqual([1_550, 500])
  expect(
    unit.accountTypes.map(({ accountType, values }) => [accountType, values]),
  ).toEqual([
    ['61', [1_000, 500]],
    ['69', [300, 0]],
    ['89', [250, 0]],
  ])
})

test('an area sums the units under it in each year, following moves', () => {
  expect(departmentBudget(AREA, BUDGETS, 'account').total).toEqual([1_580, 500])
  expect(departmentBudget(OTHER_AREA, BUDGETS, 'account').total).toEqual([
    0, 70,
  ])
})

test('the budget breaks down by fund type', () => {
  expect(departmentBudget(UNIT, BUDGETS, 'fund').series).toEqual([
    { key: 'Budgeted Operations', values: [1_300, 500] },
    { key: 'Gift Funds - Restricted', values: [250, 0] },
  ])
})

test('a code outside a year’s hierarchy has no figure for it', () => {
  const [latest, earlier] = BUDGETS
  if (!latest || !earlier) throw new Error('fixture')
  const { [UNIT]: _dropped, ...orgs } = latest.orgs
  const gone = departmentBudget(UNIT, [earlier, { ...latest, orgs }], 'account')
  expect(gone.total).toEqual([1_550, null])
  expect(departmentBudget('999999', BUDGETS, 'account').series).toEqual([])
})
