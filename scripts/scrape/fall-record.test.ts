import { expect, test } from 'vitest'
import type { FallLabel, RawBlock } from './fall-blocks.ts'
import { toFallRecord } from './fall-record.ts'

const COMMON: [FallLabel, string][] = [
  ['JOB TYPE', 'Primary'],
  ['JOB STATUS', 'On Leave No Pay No Be'],
  ['JOB START DATE', '7/1/2030'],
  ['JOB END DATE', ''],
  ['HOME DEPARTMENT', 'Invented Studies'],
  ['PAY DEPARTMENT', '123456 Invented Studies'],
  ['ANNUAL SALARY RATE', '$1,234,567'],
  ['APPT PERCENT', '0%'],
  ['TERM OF SVC', '9'],
]

function block(pairs: [FallLabel, string][]): RawBlock {
  return {
    name: 'Example, Pat Q',
    page: 7,
    fields: new Map([...COMMON, ...pairs]),
  }
}

const classified = block([
  ['EEO CATEGORY', ''],
  ['JOB TITLE', 'Invented Technician'],
  ['POSITION CLASS', 'X1234 Invented Tech 2'],
])

const unclassified = block([
  ['EEO CATEGORY', 'Faculty'],
  ['APPT STATUS', 'Tenure Track'],
  ['RANK', 'Assistant Professor'],
  ['RANK DATE', '9/16/2031'],
  ['ACADEMIC TITLE', 'Asst Professor of Ichishk├¡in ΓÇô Made Up┬á'],
  ['PRIMARY ACTIVITY', 'Instructional'],
])

test('types a classified record', () => {
  expect(toFallRecord(classified, 'classified')).toEqual({
    kind: 'classified',
    name: 'Example, Pat Q',
    jobType: 'Primary',
    jobStatus: 'On Leave No Pay No Be',
    jobStartDate: '2030-07-01',
    jobEndDate: null,
    homeDepartment: { code: null, name: 'Invented Studies' },
    payDepartment: { code: '123456', name: 'Invented Studies' },
    annualSalaryRateCents: 123_456_700,
    apptPercent: 0,
    termOfServiceMonths: 9,
    eeoCategory: null,
    sourcePage: 7,
    possibleStudent: false,
    jobTitle: 'Invented Technician',
    positionClass: { code: 'X1234', title: 'Invented Tech 2' },
  })
})

test('types an unclassified record without the optional grade', () => {
  const record = toFallRecord(unclassified, 'unclassified')
  expect(record).toMatchObject({
    kind: 'unclassified',
    rankDate: '2031-09-16',
    academicTitle: 'Asst Professor of Ichishkíin – Made Up',
    oaSalaryGrade: null,
  })
})

test('reads the optional grade when published', () => {
  const graded = block([...unclassified.fields])
  graded.fields.set('OA SALARY GRADE', 'OA06')
  expect(toFallRecord(graded, 'unclassified')).toMatchObject({
    oaSalaryGrade: 'OA06',
  })
})

test('keeps a position class published without a title', () => {
  const codeOnly = block(
    [...classified.fields].filter(([label]) => label !== 'POSITION CLASS'),
  )
  codeOnly.fields.set('POSITION CLASS', 'X1234')
  expect(toFallRecord(codeOnly, 'classified')).toMatchObject({
    positionClass: { code: 'X1234', title: null },
  })
})

test('flags a possible student', () => {
  classified.fields.set('JOB TITLE', 'Invented Office Intern')
  expect(toFallRecord(classified, 'classified').possibleStudent).toBe(true)
  classified.fields.set('JOB TITLE', 'Invented Technician')
})

test.each<[FallLabel, string, RegExp]>([
  ['ANNUAL SALARY RATE', '$12.50', /not a whole-dollar amount/],
  ['APPT PERCENT', '0.5', /not a percentage/],
  ['JOB START DATE', '2030-07-01', /not a M\/D\/YYYY date/],
  ['JOB TYPE', 'Sideline', /jobType/],
  ['TERM OF SVC', '10', /termOfServiceMonths/],
])('rejects %s "%s"', (label, value, message) => {
  const bad = block([...unclassified.fields])
  bad.fields.set(label, value)
  expect(() => toFallRecord(bad, 'unclassified')).toThrow(message)
})

test('rejects labels from the other kind', () => {
  expect(() => toFallRecord(classified, 'unclassified')).toThrow(
    /missing \[APPT STATUS, RANK, RANK DATE, ACADEMIC TITLE, PRIMARY ACTIVITY\], unexpected \[JOB TITLE, POSITION CLASS\]/,
  )
})
