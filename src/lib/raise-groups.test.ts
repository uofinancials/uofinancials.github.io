import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { raiseRowOf } from './raise-groups'

const labelOf = (...args: Parameters<typeof raiseRowOf>) =>
  raiseRowOf(...args)?.label ?? null

test('classified jobs are Teamsters by a J class, UOPA by police class from 2017, and SEIU otherwise', () => {
  const job = (code: string) =>
    classifiedJob({ positionClass: { code, title: null } })
  const staff = 'Classified staff'
  expect(labelOf(job('J2412'), 2020, staff)).toBe('Teamsters 206')
  expect(labelOf(job('D5901'), 2017, staff)).toBe('UOPA, police officers')
  expect(labelOf(job('D0312'), 2024, staff)).toBe('UOPA, dispatchers')
  expect(labelOf(job('D5523'), 2025, staff)).toBe(
    'UOPA, community service officers',
  )
  expect(labelOf(job('D5901'), 2016, staff)).toBe('SEIU 503')
  expect(labelOf(job('D5522'), 2025, staff)).toBe('SEIU 503')
  expect(labelOf(job('TS901'), 2025, 'Classified temporaries')).toBeNull()
})

test('ranked jobs split into United Academics rows; OA grades are officers of administration; the rest are in none', () => {
  const faculty = 'Faculty'
  const ranked = (overrides: Parameters<typeof unclassifiedJob>[0]) =>
    labelOf(unclassifiedJob(overrides), 2024, faculty)
  expect(ranked({ rank: 'Professor', apptStatus: 'Indefinite Tenure' })).toBe(
    'United Academics, tenure-related',
  )
  expect(ranked({ rank: 'Senior Librarian' })).toBe(
    'United Academics, career instructional',
  )
  expect(ranked({ rank: 'Research Associate' })).toBe(
    'United Academics, career research',
  )
  expect(ranked({ academicTitle: 'Visiting Assistant Professor' })).toBe(
    'United Academics, pro tem, visiting, and retired',
  )
  expect(ranked({ rank: 'Postdoctoral Scholar' })).toBeNull()
  expect(ranked({ rank: 'No Rank', oaSalaryGrade: 'OA07' })).toBe(
    'Officers of Administration',
  )
  expect(ranked({ rank: 'No Rank', oaSalaryGrade: 'SGT' })).toBeNull()
  expect(ranked({ rank: 'No Rank', oaSalaryGrade: 'CCH3' })).toBeNull()
  expect(
    labelOf(
      unclassifiedJob({ rank: 'No Rank', oaSalaryGrade: 'OA12' }),
      2024,
      'Executives',
    ),
  ).toBeNull()
})
