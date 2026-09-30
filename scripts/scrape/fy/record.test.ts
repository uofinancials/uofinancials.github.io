import { expect, test } from 'vitest'
import { type RawBlock, readBlocks } from '../pdf/blocks.ts'
import { line, page } from '../pdf/test-lines.ts'
import {
  FY_LAYOUT,
  type FyLabel,
  parsePayToCents,
  toFyRecord,
} from './record.ts'

function block(fields: [FyLabel, string][]): RawBlock<FyLabel> {
  return { name: 'Example, Pat Q', page: 3, fields: new Map(fields) }
}

const CLASSIFIED: [FyLabel, string][] = [
  ['JOB TYPE', 'Secondary'],
  ['JOB STATUS', 'Active'],
  ['HOME DEPARTMENT', 'Invented Studies'],
  ['JOB START DATE', '6/2/2030'],
  ['JOB END DATE', ''],
  ['JOB TITLE', 'Invented Helper'],
  ['PAY DEPARTMENT', 'Invented Festival'],
  ['POSITION CLASS', 'TS401 Temporary Office Support'],
  ['TERM OF SVC', '12'],
  ['TOTAL PAY', '$1,433'],
]

test('reads a classified record as published', () => {
  expect(toFyRecord(block(CLASSIFIED), 'classified')).toEqual({
    kind: 'classified',
    name: 'Example, Pat Q',
    jobType: 'Secondary',
    jobStatus: 'Active',
    jobStartDate: '2030-06-02',
    jobEndDate: null,
    homeDepartment: 'Invented Studies',
    jobTitle: 'Invented Helper',
    payDepartment: 'Invented Festival',
    positionClass: { code: 'TS401', title: 'Temporary Office Support' },
    termOfServiceMonths: 12,
    totalPayCents: 143_300,
    sourcePage: 3,
  })
})

test('reads pay in whole dollars, negative in parentheses', () => {
  expect(parsePayToCents('$0')).toBe(0)
  expect(parsePayToCents('$1,234,567')).toBe(123_456_700)
  expect(parsePayToCents('($3,548)')).toBe(-354_800)
  expect(parsePayToCents(null)).toBeNull()
})

test.each(['$1.50', '($3,548', '$3,548)', '3,548', '-$3,548'])(
  'rejects the pay "%s"',
  (value) => {
    expect(() => parsePayToCents(value)).toThrow('not a whole-dollar amount')
  },
)

test('fails a record whose pay is blank', () => {
  const blank = CLASSIFIED.map(([label, value]): [FyLabel, string] => [
    label,
    label === 'TOTAL PAY' ? '' : value,
  ])
  expect(() => toFyRecord(block(blank), 'classified')).toThrow('totalPayCents')
})

test('fails a record with another kind’s labels', () => {
  expect(() => toFyRecord(block(CLASSIFIED), 'unclassified')).toThrow(
    'missing [ACADEMIC TITLE, OA SALARY GRADE], unexpected [JOB TITLE]',
  )
})

test('reads an unclassified status from the line below its label, and a timesheet department as the pay department', () => {
  const [LEFT, LEFT_VALUE, RIGHT, RIGHT_VALUE] = [60, 160, 360, 450]
  const { blocks, failures } = readBlocks(
    [
      page(1),
      page(
        2,
        line(790, [LEFT, 'UNCLASSIFIED PERSONNEL LIST']),
        line(780, [
          LEFT,
          'Employees with Pay July 1, 2030 through June 30, 2031',
        ]),
        line(700, [LEFT, 'Example, Pat Q']),
        line(690, [LEFT, 'JOB TYPE'], [LEFT_VALUE, 'Primary']),
        line(685, [RIGHT, 'JOB STATUS']),
        line(
          680,
          [LEFT, 'HOME DEPARTMENT'],
          [LEFT_VALUE, 'Invented Studies'],
          [RIGHT, 'as of 6/30/2031'],
          [RIGHT_VALUE, 'Terminated'],
        ),
        line(
          670,
          [LEFT, 'TMSHT DEPARTMENT'],
          [LEFT_VALUE, 'Invented Operations'],
          [RIGHT, 'TOTAL PAY'],
          [RIGHT_VALUE, '($12)'],
        ),
        line(30, [LEFT, 'Source: IDR, 8/27/2031 9/4/2031 Page 2']),
      ),
    ],
    FY_LAYOUT,
  )
  expect(failures).toEqual([])
  expect(blocks.map((block) => Object.fromEntries(block.fields))).toEqual([
    {
      'JOB TYPE': 'Primary',
      'HOME DEPARTMENT': 'Invented Studies',
      'JOB STATUS': 'Terminated',
      'PAY DEPARTMENT': 'Invented Operations',
      'TOTAL PAY': '($12)',
    },
  ])
})
