import { expect, test } from 'vitest'
import type { DepartmentRow } from './table'
import { departmentTiles } from './tiles'

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
