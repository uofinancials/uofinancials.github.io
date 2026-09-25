import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import { unclassifiedJob } from '@/test/fall-records'
import {
  censusSearchSchema,
  describePlace,
  placeJobs,
  resolveCensusView,
} from './census-search'
import { toDepartmentCensus } from './department-jobs'
import { filterJobs } from './salary-distribution'

test('a malformed search falls back to the defaults', () => {
  const search = censusSearchSchema.parse({
    year: 2019,
    group: 'Nope',
    kind: 'classified',
    term: 10,
    dept: '12',
    position: 7,
  })
  expect(resolveCensusView(search, [2019, 2025])).toEqual({
    year: 2019,
    group: null,
    kind: 'classified',
    term: null,
    dept: null,
    position: null,
  })
})

test('a code the URL parser read as a number is still a code', () => {
  expect(censusSearchSchema.parse({ dept: 223100 }).dept).toBe('223100')
  expect(censusSearchSchema.parse({ dept: 22310 }).dept).toBeUndefined()
})

test('a census not listed falls back to the latest', () => {
  expect(
    resolveCensusView({ year: 2013, term: 12, dept: '222000' }, [2014, 2025]),
  ).toMatchObject({ year: 2025, term: 12, dept: '222000' })
})

test('a view narrows the census to a department or area, and names what the code is', () => {
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
  const view = resolveCensusView({}, [2025])
  expect(placeJobs(census, null)).toHaveLength(3)
  expect(placeJobs(census, '222000')).toHaveLength(2)
  expect(
    filterJobs(placeJobs(census, '223100'), { ...view, term: 12 }, 2025),
  ).toHaveLength(1)
  expect(placeJobs(census, '000000')).toEqual([])
  expect(describePlace(null, census, budget)).toEqual({ scope: 'all' })
  expect(describePlace('222000', census, budget)).toEqual({
    scope: 'area',
    code: '222000',
    name: 'Arts & Sciences, College of',
  })
  expect(describePlace('223100', census, budget)).toMatchObject({
    scope: 'department',
    name: 'CAS Biology',
  })
  expect(describePlace('000000', census, budget)).toEqual({
    scope: 'unknown',
    code: '000000',
  })
})
