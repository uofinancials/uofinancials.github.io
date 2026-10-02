import { expect, test } from 'vitest'
import { sizeLabels, sizeOf, sizeYears } from './measures'

test('a budget is named by its fiscal year, and salary spend and jobs by their census', () => {
  const tableYear = { year: 2025, fiscalYear: 2026 }
  expect(sizeYears(tableYear)).toEqual({
    budget: 'FY26',
    spend: 'Fall 2025',
    jobs: 'Fall 2025',
  })
  expect(sizeLabels(tableYear)).toEqual({
    budget: 'FY26 budget',
    spend: 'Fall 2025 salary spend',
    jobs: 'Fall 2025 jobs',
  })
})

test('a row’s size is its figure for the measure, blank where the row has none', () => {
  const row = { budgetCents: 5_000, spendCents: null, jobs: 3 }
  expect(sizeOf(row, 'budget')).toBe(5_000)
  expect(sizeOf(row, 'spend')).toBeNull()
  expect(sizeOf(row, 'jobs')).toBe(3)
})
