import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { trendGroupOf } from './trend-groups'

test('temps, then overloads, then staff kind, then the published category decide the group', () => {
  const groupOf = (record: Parameters<typeof trendGroupOf>[0]) =>
    trendGroupOf(record, 2025)
  expect(
    groupOf(classifiedJob({ positionClass: { code: 'TS901', title: null } })),
  ).toBe('Classified temporaries')
  expect(
    groupOf(classifiedJob({ positionClass: null, eeoCategory: null })),
  ).toBe('Classified temporaries')
  expect(groupOf(unclassifiedJob({ jobType: 'Overload' }))).toBe('Overloads')
  expect(groupOf(classifiedJob({ eeoCategory: 'Other Professionals' }))).toBe(
    'Classified staff',
  )
  expect(groupOf(unclassifiedJob({ eeoCategory: 'Librarians (Ranked)' }))).toBe(
    'Faculty',
  )
  expect(groupOf(unclassifiedJob({ eeoCategory: 'Exec/Admin/Mgr' }))).toBe(
    'Admins and professionals',
  )
  expect(groupOf(unclassifiedJob({ eeoCategory: 'Protective Service' }))).toBe(
    'Unclassified staff',
  )
  expect(groupOf(unclassifiedJob({ eeoCategory: null }))).toBe(
    'Category not published',
  )
})

test('a category no census has used stops the build rather than dropping jobs', () => {
  expect(() =>
    trendGroupOf(unclassifiedJob({ eeoCategory: 'Astronauts' }), 2030),
  ).toThrow('Unmapped EEO category "Astronauts" in Fall 2030')
})
