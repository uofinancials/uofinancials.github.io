import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import { unclassifiedJob } from '@/test/fall-records'
import { toDepartmentCensus } from './department-jobs'
import {
  jobsInView,
  resolveSalariesView,
  salariesSearchSchema,
} from './salaries-search'

test('a malformed search falls back to the defaults', () => {
  const search = salariesSearchSchema.parse({
    year: 2019,
    group: 'Nope',
    kind: 'classified',
    term: 10,
    dept: '12',
  })
  expect(resolveSalariesView(search, [2019, 2025])).toEqual({
    year: 2019,
    group: null,
    kind: 'classified',
    term: null,
    dept: null,
  })
})

test('a code the URL parser read as a number is still a code', () => {
  expect(salariesSearchSchema.parse({ dept: 223100 }).dept).toBe('223100')
  expect(salariesSearchSchema.parse({ dept: 22310 }).dept).toBeUndefined()
})

test('a census not listed falls back to the latest', () => {
  expect(
    resolveSalariesView({ year: 2013, term: 12, dept: '222000' }, [2014, 2025]),
  ).toMatchObject({ year: 2025, term: 12, dept: '222000' })
})

test('a view narrows the census to a department or area before filtering', () => {
  const budget: BudgetYear = {
    fiscalYear: 2026,
    period: '12',
    orgs: {
      '222000': { name: 'Arts & Sciences, College of', level: 3, parent: null },
      '223100': { name: 'CAS Biology', level: 5, parent: '222000' },
    },
    funds: {},
    fundTypes: {},
    accountTypes: {},
    rows: [],
  }
  const biology = { code: '223100', name: 'CAS Biology' }
  const census = toDepartmentCensus(
    {
      year: 2025,
      records: [
        unclassifiedJob({ payDepartment: biology }),
        unclassifiedJob({ payDepartment: biology, termOfServiceMonths: 12 }),
        unclassifiedJob({ payDepartment: { code: '999999', name: 'Zz' } }),
      ],
    },
    budget,
  )
  const view = resolveSalariesView({}, [2025])
  expect(jobsInView(census, view)).toHaveLength(3)
  expect(jobsInView(census, { ...view, dept: '222000' })).toHaveLength(2)
  expect(
    jobsInView(census, { ...view, dept: '223100', term: 12 }),
  ).toHaveLength(1)
  expect(jobsInView(census, { ...view, dept: '000000' })).toEqual([])
})
