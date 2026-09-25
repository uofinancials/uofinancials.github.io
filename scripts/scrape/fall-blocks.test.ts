import { expect, test } from 'vitest'
import { readFallBlocks } from './fall-blocks.ts'
import { line, page } from './test-lines.ts'

const LEFT = 10
const LEFT_VALUE = 120
const RIGHT = 400
const RIGHT_VALUE = 500

const definitions = page(1, line(700, [LEFT, 'REPORT DEFINITIONS:']))
const chrome = [
  line(780, [LEFT, 'UNCLASSIFIED PERSONNEL LIST']),
  line(770, [LEFT, 'UNIVERSITY OF OREGON']),
  line(760, [LEFT, 'Employees on Record as of November 1, 2031']),
  line(750, [LEFT, 'NOTE: An employee can have more than one job.']),
  line(40, [LEFT, 'UO Office of Institutional Research']),
  line(30, [LEFT, 'Source: HRIS Data Warehouse, 11/5/2031 1/9/2032 Page 2']),
]

function fields(name: string, pairs: [string, string][]) {
  return { name, page: 2, fields: new Map(pairs) }
}

test('pairs left and right labels with their values', () => {
  const { blocks, failures } = readFallBlocks([
    definitions,
    page(
      2,
      ...chrome,
      line(700, [LEFT, 'Example, Pat Q']),
      line(
        690,
        [LEFT, 'JOB TYPE'],
        [LEFT_VALUE, 'Primary'],
        [RIGHT, 'JOB STATUS'],
        [RIGHT_VALUE, 'Active'],
      ),
      line(
        680,
        [LEFT, 'HOME DEPARTMENT'],
        [LEFT_VALUE, '123456'],
        [LEFT_VALUE + 60, 'Invented Studies'],
        [RIGHT, 'APPT STATUS'],
      ),
    ),
  ])
  expect(failures).toEqual([])
  expect(blocks).toEqual([
    fields('Example, Pat Q', [
      ['JOB TYPE', 'Primary'],
      ['JOB STATUS', 'Active'],
      ['HOME DEPARTMENT', '123456 Invented Studies'],
      ['APPT STATUS', ''],
    ]),
  ])
})

test('appends a wrapped title to the field above it', () => {
  const { blocks } = readFallBlocks([
    definitions,
    page(
      2,
      line(700, [LEFT, 'Sample, Lee']),
      line(690, [LEFT, 'JOB TYPE'], [LEFT_VALUE, 'Secondary']),
      line(
        680,
        [LEFT, 'ACADEMIC TITLE'],
        [LEFT_VALUE, 'Director of Very Long'],
        [RIGHT, 'TERM OF SVC'],
        [RIGHT_VALUE, '12'],
      ),
      line(670, [LEFT_VALUE, 'Invented Titles']),
      line(660, [LEFT, 'PAY DEPARTMENT'], [LEFT_VALUE, '654321 Made Up']),
    ),
  ])
  expect(blocks[0]?.fields.get('ACADEMIC TITLE')).toBe(
    'Director of Very Long Invented Titles',
  )
  expect(blocks[0]?.fields.get('TERM OF SVC')).toBe('12')
})

test('starts a new record at each name line and records its page', () => {
  const { blocks } = readFallBlocks([
    definitions,
    page(
      2,
      line(700, [LEFT, 'First, One']),
      line(690, [LEFT, 'JOB TYPE'], [LEFT_VALUE, 'Primary']),
    ),
    page(
      3,
      line(700, [LEFT, 'Second, Two']),
      line(690, [LEFT, 'JOB TYPE'], [LEFT_VALUE, 'Overload']),
    ),
  ])
  expect(blocks.map((block) => [block.name, block.page])).toEqual([
    ['First, One', 2],
    ['Second, Two', 3],
  ])
})

test('reports text it cannot place', () => {
  const { failures } = readFallBlocks([
    definitions,
    page(
      2,
      line(700, [LEFT_VALUE, 'stray text']),
      line(690, [LEFT, 'Orphan, Name']),
    ),
  ])
  expect(failures.map((failure) => failure.message)).toEqual([
    'unplaced text: stray text',
    'unplaced text: Orphan, Name',
  ])
})

test('reports a label seen twice in one record', () => {
  const { failures } = readFallBlocks([
    definitions,
    page(
      2,
      line(700, [LEFT, 'Twice, Tom']),
      line(690, [LEFT, 'JOB TYPE'], [LEFT_VALUE, 'Primary']),
      line(680, [LEFT, 'EEO CATEGORY'], [LEFT_VALUE, 'Faculty']),
      line(670, [LEFT, 'EEO CATEGORY'], [LEFT_VALUE, 'Faculty']),
    ),
  ])
  expect(failures[0]?.message).toBe('Twice, Tom: EEO CATEGORY appears twice')
})

test('reports a record with no name line', () => {
  const { failures } = readFallBlocks([
    definitions,
    page(2, line(690, [LEFT, 'JOB TYPE'], [LEFT_VALUE, 'Primary'])),
  ])
  expect(failures[0]?.message).toBe('JOB TYPE without a name line')
})
