import { expect, test } from 'vitest'
import type { Projection } from '@/data/outlook'
import {
  FUND_BALANCE_SERIES,
  gapRows,
  outlookSeries,
  RUN_RATE_SERIES,
} from './budget-outlook'

function source(url: string, retrievedOn = '2026-09-25') {
  return { url, document: url, location: 'p. 1', retrievedOn }
}

const PACKET = 'https://example.org/packet.pdf'

const PROJECTION: Projection = {
  id: 'test',
  title: 'Test',
  fiscalYears: [2026, 2027],
  source: source(PACKET),
  lines: [
    { label: 'Tuition', section: 'revenue', kind: 'line', cents: [250, 240] },
    { label: 'Revenue', section: 'revenue', kind: 'total', cents: [300, 290] },
    { label: 'Expenses', section: 'expense', kind: 'total', cents: [200, 390] },
  ],
  runRateCents: [100, -100],
  beginningFundBalanceCents: [50, 150],
  endingFundBalanceCents: [150, 50],
  weeksOfExpenses: [2, 1],
  presentValueCents: -90,
  reductionTargetCents: 100,
  reductionTargetSource: source(PACKET),
  cases: [],
  casesSource: source(PACKET),
  assumptions: [],
}

test('each projected year has its totals, run rate, and ending fund balance', () => {
  expect(gapRows(PROJECTION)).toEqual([
    {
      fiscalYear: 2026,
      revenueCents: 300,
      expenseCents: 200,
      runRateCents: 100,
      endingFundBalanceCents: 150,
    },
    {
      fiscalYear: 2027,
      revenueCents: 290,
      expenseCents: 390,
      runRateCents: -100,
      endingFundBalanceCents: 50,
    },
  ])
})

test('the chart has a run-rate and an ending fund balance line over the fiscal years', () => {
  expect(outlookSeries(PROJECTION)).toEqual({
    labels: ['FY26', 'FY27'],
    series: [
      { key: RUN_RATE_SERIES, values: [100, -100] },
      { key: FUND_BALANCE_SERIES, values: [150, 50] },
    ],
  })
})
