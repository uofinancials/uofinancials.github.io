import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { opeGroupOf } from './ope-groups'

const ATHLETICS_PAY = { code: '481100', name: 'Athletics Football' }
const positionClass = (code: string) => ({ code, title: null })

test('overloads and temporaries have no group; Athletics pay comes before every other rule', () => {
  const staff = 'Classified staff'
  expect(
    opeGroupOf(unclassifiedJob({ jobType: 'Overload' }), 'Overloads', 2025),
  ).toBeNull()
  expect(
    opeGroupOf(
      classifiedJob({ positionClass: positionClass('TS901') }),
      'Classified temporaries',
      2025,
    ),
  ).toBeNull()
  expect(
    opeGroupOf(classifiedJob({ payDepartment: ATHLETICS_PAY }), staff, 2025),
  ).toEqual({ group: 'Athletics', leave: null })
  expect(
    opeGroupOf(
      unclassifiedJob({ payDepartment: ATHLETICS_PAY }),
      'Executives',
      2025,
    ),
  ).toEqual({ group: 'Athletics', leave: null })
})

test('classified jobs are Technical by a J class, and otherwise follow their EEO category', () => {
  const staff = 'Classified staff'
  const groupOf = (overrides: Parameters<typeof classifiedJob>[0]) =>
    opeGroupOf(classifiedJob(overrides), staff, 2025)?.group
  expect(
    groupOf({
      positionClass: positionClass('J2412'),
      eeoCategory: 'Service/Maint',
    }),
  ).toBe('Classified Technical')
  expect(groupOf({ eeoCategory: 'Service/Maint - Protective' })).toBe(
    'Classified Service',
  )
  expect(groupOf({ eeoCategory: 'Skilled Craft' })).toBe(
    'Classified Skilled/Clerical',
  )
  expect(groupOf({ eeoCategory: 'Other Professionals' })).toBe(
    'Classified Technical',
  )
  expect(() => groupOf({ eeoCategory: 'Other' })).toThrow(
    'Unmapped classified EEO category "Other" in Fall 2025',
  )
})

test('unclassified jobs: executives and postdocs are B, under half time is C, 9-month faculty is B, the rest A', () => {
  const groupOf = (
    group: Parameters<typeof opeGroupOf>[1],
    overrides: Parameters<typeof unclassifiedJob>[0] = {},
  ) => opeGroupOf(unclassifiedJob(overrides), group, 2025)
  expect(groupOf('Executives', { apptPercent: 20 })).toEqual({
    group: 'Faculty/Staff B',
    leave: 'Exec',
  })
  expect(
    groupOf('Faculty', { rank: 'Postdoctoral Scholar', apptPercent: 40 }),
  ).toEqual({ group: 'Faculty/Staff B', leave: 'Faculty' })
  expect(groupOf('Faculty', { apptPercent: 49 })?.group).toBe('Faculty/Staff C')
  expect(groupOf('Faculty', { apptPercent: 50 })).toEqual({
    group: 'Faculty/Staff B',
    leave: 'Faculty',
  })
  expect(groupOf('Faculty', { termOfServiceMonths: 12 })?.group).toBe(
    'Faculty/Staff A',
  )
  expect(groupOf('Admins and professionals')?.group).toBe('Faculty/Staff A')
})
