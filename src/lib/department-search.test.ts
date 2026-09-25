import { expect, test } from 'vitest'
import {
  budgetYearLabel,
  departmentSearchSchema,
  resolveDepartmentView,
} from './department-search'

test('a malformed search falls back to the defaults', () => {
  const search = departmentSearchSchema.parse({
    budget: 'nope',
    metric: 'fte',
    kind: 'classified',
    year: 'x',
  })
  expect(resolveDepartmentView(search, [2023, 2025])).toEqual({
    budget: 'account',
    metric: 'fte',
    kind: 'classified',
    year: 2025,
  })
})

test('the class table census must be one with jobs', () => {
  expect(resolveDepartmentView({ year: 2023 }, [2023, 2025]).year).toBe(2023)
  expect(resolveDepartmentView({ year: 2024 }, [2023, 2025]).year).toBe(2025)
  expect(resolveDepartmentView({}, []).year).toBeNull()
})

test('a budget year before year-end names its posting period', () => {
  expect(budgetYearLabel({ fiscalYear: 2025, period: '14' })).toBe('FY25')
  expect(budgetYearLabel({ fiscalYear: 2027, period: '02' })).toBe(
    'FY27 (period 2)',
  )
})
