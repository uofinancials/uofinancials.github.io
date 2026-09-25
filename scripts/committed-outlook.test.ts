import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import {
  outlookSchema,
  type Projection,
  type ProjectionLine,
} from '../src/data/outlook.ts'
import { DATA_DIR } from './scrape/cache.ts'

/** The published tables round each figure to the dollar, so their sums can be a dollar off. */
const ROUNDING_CENTS = 100

const outlook = outlookSchema.parse(
  JSON.parse(readFileSync(path.join(DATA_DIR, 'outlook.json'), 'utf8')),
)

function expectWithinRounding(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(ROUNDING_CENTS)
}

/** Each year's sum of a section's subtotals and of the lines under none; checks each subtotal on the way. */
function expectSectionSums(lines: ProjectionLine[], year: number) {
  let sinceSubtotal = 0
  let total = 0
  for (const { kind, cents } of lines) {
    const value = cents[year] ?? 0
    if (kind === 'line') {
      sinceSubtotal += value
    } else if (kind === 'subtotal') {
      expectWithinRounding(sinceSubtotal, value)
      total += value
      sinceSubtotal = 0
    } else {
      expectWithinRounding(total + sinceSubtotal, value)
    }
  }
}

function totalOf(projection: Projection, section: ProjectionLine['section']) {
  const line = projection.lines.find(
    (candidate) => candidate.section === section && candidate.kind === 'total',
  )
  if (!line) throw new Error(`${projection.id} has no ${section} total`)
  return line.cents
}

test.each(outlook.projections)(
  'projection $id: lines sum to their totals, revenue less expenses is the run rate, and balances roll forward',
  (projection) => {
    const revenue = totalOf(projection, 'revenue')
    const expenses = totalOf(projection, 'expense')
    projection.fiscalYears.forEach((_, year) => {
      for (const section of ['revenue', 'expense'] as const) {
        expectSectionSums(
          projection.lines.filter((line) => line.section === section),
          year,
        )
      }
      const runRate = projection.runRateCents[year] ?? 0
      expectWithinRounding(
        (revenue[year] ?? 0) - (expenses[year] ?? 0),
        runRate,
      )
      expectWithinRounding(
        (projection.beginningFundBalanceCents[year] ?? 0) + runRate,
        projection.endingFundBalanceCents[year] ?? 0,
      )
      const next = projection.beginningFundBalanceCents[year + 1]
      if (next !== undefined) {
        expect(next).toBe(projection.endingFundBalanceCents[year])
      }
    })
  },
)

test.each(outlook.projections)(
  'projection $id: each case starts from the base balance and rolls forward, and the first case is the base case',
  (projection) => {
    for (const scenario of projection.cases) {
      scenario.runRateCents.forEach((runRate, year) => {
        const before =
          year === 0
            ? projection.beginningFundBalanceCents[0]
            : scenario.endingFundBalanceCents[year - 1]
        expectWithinRounding(
          (before ?? 0) + runRate,
          scenario.endingFundBalanceCents[year] ?? 0,
        )
      })
    }
    expect(projection.cases[0]?.runRateCents).toEqual(projection.runRateCents)
    expect(projection.cases[0]?.presentValueCents).toBe(
      projection.presentValueCents,
    )
  },
)

test('the June 2026 projection is pinned at its published FY31 gap and present value', () => {
  const [june] = outlook.projections
  expect(june?.fiscalYears).toEqual([2026, 2027, 2028, 2029, 2030, 2031])
  expect(june?.runRateCents.at(-1)).toBe(-7_314_386_800)
  expect(june?.presentValueCents).toBe(-6_326_469_500)
  expect(june?.cases).toHaveLength(6)
})

test('the FY27 all-funds budget is E&G plus Other Funds', () => {
  const { allFunds } = outlook
  expect(allFunds.egExpenseCents + allFunds.otherExpenseCents).toBe(
    allFunds.totalExpenseCents,
  )
  expect(allFunds.egRevenueCents + allFunds.otherRevenueCents).toBe(
    allFunds.totalRevenueCents,
  )
  expect(allFunds.totalExpenseCents).toBe(155_350_000_000)
})
