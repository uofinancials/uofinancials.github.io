import { expect, test } from 'vitest'
import {
  budgetYearLabel,
  departmentSearchSchema,
  departmentsSearchSchema,
  resolveDepartmentsView,
  resolveDepartmentView,
} from './department-search'

test('a malformed search falls back to the defaults', () => {
  const search = departmentSearchSchema.parse({
    budget: 'nope',
    metric: 'fte',
    kind: 'classified',
    year: 'x',
    sort: 'nope',
    dir: 'asc',
  })
  expect(resolveDepartmentView(search, [2023, 2025])).toEqual({
    budget: 'account',
    metric: 'fte',
    kind: 'classified',
    year: 2025,
    sort: 'budget',
    dir: 'asc',
  })
})

test('the index opens on areas by budget, largest first, and keeps what the link asks for', () => {
  expect(resolveDepartmentsView(departmentsSearchSchema.parse({}))).toEqual({
    q: '',
    level: 'areas',
    area: null,
    sort: 'budget',
    dir: 'desc',
  })
  expect(
    resolveDepartmentsView(
      departmentsSearchSchema.parse({
        level: 'units',
        area: 222000,
        sort: 'jobsChange',
        dir: 'up',
      }),
    ),
  ).toMatchObject({
    level: 'units',
    area: '222000',
    sort: 'jobsChange',
    dir: 'desc',
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
