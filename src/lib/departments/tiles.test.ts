import { expect, test } from 'vitest'
import type { DepartmentRow } from './table'
import { departmentTiles, notDrawnNote, tileText } from './tiles'

const NO_CHANGES = { budget: null, jobs: null, spend: null, median: null }

function row(
  name: string,
  figures: Partial<Pick<DepartmentRow, 'budgetCents' | 'spendCents' | 'jobs'>>,
  changes: Partial<DepartmentRow['changes']> = {},
): DepartmentRow {
  return {
    code: name === 'Unplaced' ? null : name.toLowerCase(),
    name,
    area: null,
    budgetCents: null,
    jobs: 0,
    spendCents: null,
    medianRateCents: null,
    ...figures,
    changes: { ...NO_CHANGES, ...changes },
  }
}

const ROWS = [
  row('Small', { budgetCents: 2_000, jobs: 30 }, { budget: -0.5, jobs: 0 }),
  row('Large', { budgetCents: 6_000, jobs: 10 }, { budget: 0.25 }),
  row('Beta', { budgetCents: 2_000, jobs: 0 }, { budget: 0 }),
  row('Negative', { budgetCents: -4_000, jobs: 0 }, { budget: 0.1 }),
  row('Empty', { budgetCents: 0 }),
  row('Unplaced', { jobs: 10 }),
]

test('rows with a figure above zero become tiles, largest first with ties by name, and the rest are counted', () => {
  const { tiles, notDrawn } = departmentTiles(ROWS, 'budget')
  expect(tiles.map(({ name, value, share }) => [name, value, share])).toEqual([
    ['Large', 6_000, 0.6],
    ['Beta', 2_000, 0.2],
    ['Small', 2_000, 0.2],
  ])
  expect(notDrawn).toBe(3)
  expect(departmentTiles(ROWS, 'spend')).toEqual({ tiles: [], notDrawn: 6 })
})

test('a tile’s direction is its own measure’s change, flat for none and for a blank', () => {
  expect(
    departmentTiles(ROWS, 'budget').tiles.map(({ name, change, direction }) => [
      name,
      change,
      direction,
    ]),
  ).toEqual([
    ['Large', 0.25, 'rose'],
    ['Beta', 0, 'flat'],
    ['Small', -0.5, 'fell'],
  ])
  expect(
    departmentTiles(ROWS, 'jobs').tiles.map(
      ({ code, value, share, change, direction }) => [
        code,
        value,
        share,
        change,
        direction,
      ],
    ),
  ).toEqual([
    ['small', 30, 0.6, 0, 'flat'],
    ['large', 10, 0.2, null, 'flat'],
    [null, 10, 0.2, null, 'flat'],
  ])
})

test('a tile prints money to three digits, and lists its exact figure, share, and change in full', () => {
  const tile = {
    code: '222000',
    name: 'Arts & Sciences, College of',
    value: 20_265_328_613,
    share: 0.1145,
    change: 0.0321,
    direction: 'rose' as const,
  }
  expect(tileText(tile, 'budget', 'FY25')).toEqual({
    short: '$203M',
    change: '+3.2%',
    figure: '$202,653,286',
    share: '11.5% of the budget drawn',
    changed: '+3.2% from FY25',
    summary:
      'Arts & Sciences, College of: $202,653,286, 11.5% of the budget drawn, +3.2% from FY25',
  })
  expect(
    tileText({ ...tile, value: 1_273, change: null }, 'jobs', 'Fall 2024'),
  ).toEqual({
    short: '1,273',
    change: null,
    figure: '1,273 jobs',
    share: '11.5% of the jobs drawn',
    changed: null,
    summary: 'Arts & Sciences, College of: 1,273 jobs, 11.5% of the jobs drawn',
  })
})

test('the note counts the rows left out, in the singular for one', () => {
  expect(notDrawnNote(2, 'area', 'budget')).toBe(
    '2 areas with no budget above zero are not drawn; the table lists them.',
  )
  expect(notDrawnNote(1, 'unit', 'spend')).toBe(
    '1 unit with no salary spend above zero is not drawn; the table lists it.',
  )
})
