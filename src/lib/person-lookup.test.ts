import { expect, test } from 'vitest'
import { census, classifiedJob, unclassifiedJob } from '@/test/fall-records'
import {
  formatYearRanges,
  indexPeople,
  matchPeople,
  type Person,
  yearsOf,
} from './person-lookup'

function runYears(person: Person | undefined) {
  return person?.runs.map((run) => [
    run.years.map(({ year }) => year),
    run.isLinked,
  ])
}

const physics = { code: '222222', name: 'Physics' }

test('a name’s years split into runs where no link joins them', () => {
  const [ann] = indexPeople([
    census(2014, [classifiedJob()]),
    census(2015, [classifiedJob()]),
    census(2016, [classifiedJob({ payDepartment: physics })]),
    census(2018, [classifiedJob({ payDepartment: physics })]),
    census(2019, [classifiedJob({ payDepartment: physics })]),
  ])
  expect(runYears(ann)).toEqual([
    [[2014, 2015], true],
    [[2016], false],
    [[2018, 2019], true],
  ])
  expect(ann && yearsOf(ann)).toEqual([2014, 2015, 2016, 2018, 2019])
})

test('a year with two primary jobs is not linked, and keeps both records', () => {
  const [ann] = indexPeople([
    census(2015, [classifiedJob()]),
    census(2014, [classifiedJob(), unclassifiedJob()]),
  ])
  expect(runYears(ann)).toEqual([
    [[2014], false],
    [[2015], false],
  ])
  expect(
    ann?.runs.flatMap((run) => run.years.map(({ records }) => records.length)),
  ).toEqual([2, 1])
})

const people = indexPeople([
  census(2025, [
    classifiedJob({ name: 'Smith, John' }),
    classifiedJob({ name: 'Smith, Jane A' }),
    classifiedJob({ name: 'Johnson, Al' }),
  ]),
])

test('every word of the query must appear in the name, in any order and case', () => {
  expect(
    matchPeople(people, 'jo SMITH')?.matches.map(({ name }) => name),
  ).toEqual(['Smith, John'])
  expect(
    matchPeople(people, 'smith,  j')?.matches.map(({ name }) => name),
  ).toEqual(['Smith, Jane A', 'Smith, John'])
  expect(matchPeople(people, 'john')?.total).toBe(2)
})

test('a query under two characters does not search', () => {
  expect(matchPeople(people, ' j ')).toBeNull()
  expect(matchPeople(people, 'zz')).toEqual({ matches: [], total: 0 })
})

test('matches stop at 50 but count them all', () => {
  const many = indexPeople([
    census(
      2025,
      Array.from({ length: 60 }, (_, index) =>
        classifiedJob({ name: `Doe, Person ${index}` }),
      ),
    ),
  ])
  const found = matchPeople(many, 'doe')
  expect(found?.matches).toHaveLength(50)
  expect(found?.total).toBe(60)
})

test('years are written as ranges', () => {
  expect(formatYearRanges([2014, 2016, 2017, 2018, 2025])).toBe(
    '2014, 2016-2018, 2025',
  )
  expect(formatYearRanges([2020])).toBe('2020')
})
