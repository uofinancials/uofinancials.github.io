import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { personFields } from './person-fields'

test('a classified year lists only the fields its report publishes, as published', () => {
  const fields = personFields([classifiedJob({ jobEndDate: '2026-06-30' })])
  expect(fields.map(({ label }) => label)).not.toContain('Rank')
  expect(
    Object.fromEntries(fields.map(({ label, values }) => [label, values])),
  ).toMatchObject({
    Title: ['Office Specialist 2'],
    'Position class': ['E0104 Office Specialist 2'],
    'Home department': ['Home'],
    'Pay department': ['Dept (111111)'],
    'Annual salary rate': ['$50,000'],
    Appointment: ['100%'],
    'Term of service': ['12 months'],
    'Job end': ['2026-06-30'],
  })
})

test('a year with both kinds shows each job’s fields, blank where its report has none', () => {
  const fields = personFields([classifiedJob(), unclassifiedJob()])
  const byLabel = Object.fromEntries(
    fields.map(({ label, values }) => [label, values]),
  )
  expect(byLabel.Rank).toEqual(['–', 'Instructor'])
  expect(byLabel['Position class']).toEqual(['E0104 Office Specialist 2', '–'])
  expect(byLabel['Salary report']).toEqual(['Classified', 'Unclassified'])
  expect(byLabel['Job end']).toEqual(['–', '–'])
})
