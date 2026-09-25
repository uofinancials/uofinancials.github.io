import { expect, test } from 'vitest'
import { resolveSalariesView, salariesSearchSchema } from './salaries-search'

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

test('a census not listed falls back to the latest', () => {
  expect(
    resolveSalariesView({ year: 2013, term: 12, dept: '222000' }, [2014, 2025]),
  ).toMatchObject({ year: 2025, term: 12, dept: '222000' })
})
