import type { BudgetRow, BudgetYear } from '@/data/budget'
import type { OpeRates } from '@/data/ope'
import type { Projection } from '@/data/outlook'
import type { ScenarioResult } from '@/lib/scenario'

export const AREA = '222000'
export const UNIT = '223100'

/** A budget row with every amount zero except the total. */
export function budgetRow(
  row: Pick<BudgetRow, 'org' | 'fund' | 'accountType'> & {
    totalExpenditureBudgetCents: number
  },
): BudgetRow {
  return {
    period: '12',
    beginningBudgetCents: 0,
    permAdjustmentsCents: 0,
    permStrategicInitiativeCents: 0,
    totalPermBudgetCents: 0,
    carryForwardCents: 0,
    tempBudgetCents: 0,
    tempStrategicInitiativeCents: 0,
    totalTempBudgetCents: 0,
    ...row,
  }
}

/** One area with one unit, an E&G fund, and a gift fund, for tests. */
export function scenarioBudget(rows: BudgetRow[]): BudgetYear {
  return {
    fiscalYear: 2026,
    period: '12',
    orgs: {
      [AREA]: { name: 'Arts & Sciences', level: 3, parent: null },
      [UNIT]: { name: 'CAS Biology', level: 5, parent: AREA },
    },
    funds: {
      EG0001: { name: 'General', fundType: '11', fundGroup: '10' },
      GF0001: { name: 'Gift', fundType: '36', fundGroup: '30' },
    },
    fundTypes: { '11': 'Budgeted Operations', '36': 'Gift Funds - Restricted' },
    accountTypes: { '61': 'Unclassified Salaries', '71': 'Service & Supplies' },
    rows,
  }
}

/** FY26 OPE rates and FY27 leave rates for three groups, for tests. */
export const RATES: OpeRates = {
  groups: [],
  opeRates: [
    {
      fiscalYear: 2026,
      group: 'Faculty/Staff A',
      basisPoints: 7_000,
      source: 'history',
    },
    {
      fiscalYear: 2026,
      group: 'Classified Skilled/Clerical',
      basisPoints: 9_000,
      source: 'history',
    },
    {
      fiscalYear: 2026,
      group: 'Faculty/Staff B',
      basisPoints: 5_000,
      source: 'history',
    },
  ],
  leaveRates: [
    {
      fiscalYear: 2027,
      group: 'Faculty/Staff A',
      appliesTo: null,
      basisPoints: 1_000,
    },
    {
      fiscalYear: 2027,
      group: 'Classified Skilled/Clerical',
      appliesTo: null,
      basisPoints: 1_000,
    },
    {
      fiscalYear: 2027,
      group: 'Faculty/Staff B',
      appliesTo: 'Faculty',
      basisPoints: 100,
    },
    {
      fiscalYear: 2027,
      group: 'Faculty/Staff B',
      appliesTo: 'Exec',
      basisPoints: 1_000,
    },
  ],
  persRepayment: [],
}

/** Each rule's savings, `null` for a freeze. */
export function censusSavings(result: ScenarioResult) {
  return result.rules.map((rule) =>
    rule.kind === 'census' ? rule.savings : null,
  )
}

const SOURCE = {
  url: 'https://example.org/packet.pdf',
  document: 'Packet',
  location: 'p. 1',
  retrievedOn: '2026-09-25',
}

/** A three-year projection with two cases, for tests. */
export const TEST_PROJECTION: Projection = {
  id: 'test',
  title: 'Test projection',
  fiscalYears: [2026, 2027, 2028],
  source: SOURCE,
  lines: [
    {
      label: 'Revenue',
      section: 'revenue',
      kind: 'total',
      cents: [10_000, 10_000, 10_000],
    },
    {
      label: 'Expenses',
      section: 'expense',
      kind: 'total',
      cents: [9_900, 11_000, 12_000],
    },
  ],
  runRateCents: [100, -1_000, -2_000],
  beginningFundBalanceCents: [5_000, 5_100, 4_100],
  endingFundBalanceCents: [5_100, 4_100, 2_100],
  weeksOfExpenses: [26.8, 19.4, 9.1],
  presentValueCents: 0,
  reductionTargetCents: 0,
  reductionTargetSource: SOURCE,
  cases: [
    {
      label: 'Base case',
      runRateCents: [100, -1_000, -2_000],
      endingFundBalanceCents: [5_100, 4_100, 2_100],
      weeksOfExpenses: [26.8, 19.4, 9.1],
      presentValueCents: 0,
    },
    {
      label: 'Less state funding',
      runRateCents: [100, -1_500, -2_500],
      endingFundBalanceCents: [5_100, 3_600, 1_100],
      weeksOfExpenses: [26.8, 17.0, 4.8],
      presentValueCents: 0,
    },
  ],
  casesSource: SOURCE,
  assumptions: [],
}
