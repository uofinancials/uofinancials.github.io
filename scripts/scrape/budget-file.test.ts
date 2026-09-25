import { expect, test } from 'vitest'
import * as XLSX from 'xlsx'
import { parseBudgetWorkbook, splitCode, toCents } from './budget-file.ts'

const HEADER = [
  'FISCAL_YEAR',
  'POSTING_PERIOD',
  'ORG LVL 3',
  'ORG LVL 5',
  'FT 1',
  'FT 2',
  'Fund',
  'Account Type 2',
  'Beginning Budget',
  'Perm Adjustments',
  'Perm Strategic Initiative',
  'Total Perm Budget',
  'Carry Forward',
  'Temp Budget',
  'Temp Strategic Initiative',
  'Total Temp Budget',
  'Total Expenditure Budget',
]

const DIMENSIONS = [
  '900000-Invented College',
  '90012A-Invented Department',
  '10-Unrestricted Funds',
  '11-Budgeted Operations',
  'X1Y2Z3 - Invented Fund\t\t',
  '61-Unclassified Salaries',
]

function workbook(
  rows: unknown[][],
  sheetName = '_5_BCs_External',
): Uint8Array {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([HEADER, ...rows]),
    sheetName,
  )
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))
}

test('reads rows into codes, lookups, and cents', () => {
  const { year, failures } = parseBudgetWorkbook(
    workbook([
      [
        '2031',
        '01',
        ...DIMENSIONS,
        1000.25,
        0,
        0,
        1000.25,
        0,
        0,
        0,
        0,
        1000.25,
      ],
      ['2031', '02', ...DIMENSIONS, 0, -50, 0, -50, 200, 0, 0, 200, 150],
    ]),
    2031,
    '02',
  )
  expect(failures).toEqual([])
  expect(
    year?.rows.map((row) => [
      row.period,
      row.org,
      row.fund,
      row.totalExpenditureBudgetCents,
    ]),
  ).toEqual([
    ['01', '90012A', 'X1Y2Z3', 100_025],
    ['02', '90012A', 'X1Y2Z3', 15_000],
  ])
  expect(year?.orgs).toEqual({
    '900000': { name: 'Invented College', level: 3, parent: null },
    '90012A': { name: 'Invented Department', level: 5, parent: '900000' },
  })
  expect(year?.funds).toEqual({
    X1Y2Z3: { name: 'Invented Fund', fundType: '11', fundGroup: '10' },
  })
  expect(year?.fundTypes).toEqual({
    '10': 'Unrestricted Funds',
    '11': 'Budgeted Operations',
  })
  expect(year?.accountTypes).toEqual({ '61': 'Unclassified Salaries' })
})

test('fails a row whose totals do not add up', () => {
  const { year, failures } = parseBudgetWorkbook(
    workbook([['2031', '01', ...DIMENSIONS, 10, 0, 0, 10, 0, 0, 0, 0, 11]]),
    2031,
    '01',
  )
  expect(year).toBeNull()
  expect(failures).toEqual([
    {
      row: 2,
      message:
        'Total Expenditure Budget does not equal permanent plus temporary',
    },
  ])
})

test('fails a row from another fiscal year, or a code published with two names', () => {
  const renamed = [...DIMENSIONS]
  renamed[1] = '90012A-Renamed Department'
  const { failures } = parseBudgetWorkbook(
    workbook([
      ['2030', '01', ...DIMENSIONS, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ['2031', '01', ...DIMENSIONS, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ['2031', '02', ...renamed, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]),
    2031,
    '02',
  )
  expect(failures.map((failure) => failure.row)).toEqual([2, 4])
  expect(failures[0]?.message).toMatch(/FISCAL_YEAR 2030 in an FY2031 file/)
  expect(failures[1]?.message).toMatch(/code 90012A is published as both/)
})

test('rejects a workbook without the data sheet or with another header', () => {
  expect(
    parseBudgetWorkbook(workbook([], 'Other'), 2031, '01').failures[0]?.message,
  ).toBe('no _5_BCs_External sheet')
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([['FISCAL_YEAR']]),
    '_5_BCs_External',
  )
  const bytes = new Uint8Array(
    XLSX.write(book, { type: 'array', bookType: 'xlsx' }),
  )
  expect(parseBudgetWorkbook(bytes, 2031, '01').failures[0]?.message).toMatch(
    /unexpected header/,
  )
})

test('splits code-name values and converts amounts', () => {
  expect(
    splitCode('22397E-CAS Academic Support Unit 5', /^([0-9A-Z]{6})-(.+)$/),
  ).toEqual({
    code: '22397E',
    name: 'CAS Academic Support Unit 5',
  })
  expect(() => splitCode('no code here', /^([0-9A-Z]{6})-(.+)$/)).toThrow(
    /not a code-name value/,
  )
  expect(toCents(-1234.5)).toBe(-123_450)
  expect(toCents(0.1 + 0.2)).toBe(30)
  expect(toCents(1234.56)).toBe(123_456)
  expect(() => toCents(1.005)).toThrow(/more than two decimals/)
  expect(() => toCents(1.0001)).toThrow(/more than two decimals/)
  expect(() => toCents('12')).toThrow(/not an amount/)
})
