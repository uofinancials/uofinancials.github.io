import { expect, test } from 'vitest'
import {
  growthAnswer,
  moneyAnswer,
  raisesAnswer,
  ratioAnswer,
  splitAnswer,
  unindexedNote,
} from './report-text'

const ROWS = [
  { key: 'Faculty', jobs: 0.004, fte: 0.05, spend: 0.5, median: 0.42 },
  { key: 'Executives', jobs: 0.2, fte: 0.2, spend: 1.2, median: null },
  { key: 'Overloads', jobs: null, fte: null, spend: -0.36, median: null },
  { key: 'All jobs', jobs: 0.12, fte: 0.16, spend: 0.71, median: 0.47 },
]

test('the growth answer names all jobs’ change and the groups that changed most and least', () => {
  expect(growthAnswer(ROWS, 'jobs', 2014)).toBe(
    'Jobs since Fall 2014: +12.0% for all jobs. Executives changed most, +20.0%, and Faculty least, +0.4%.',
  )
  expect(growthAnswer(ROWS, 'spend', 2014)).toContain(
    'and Overloads least, -36.0%.',
  )
  expect(growthAnswer(ROWS, 'median', 2014)).toBeNull()
})

test('lines without a first value are listed with their verb agreeing', () => {
  expect(unindexedNote([], 'jobs', 2014)).toBeNull()
  expect(unindexedNote(['Overloads'], 'spend', 2014)).toBe(
    'Overloads has no salary spend shown in Fall 2014, so it has no index; the table has its figures.',
  )
  expect(unindexedNote(['A', 'B', 'C'], 'fte', 2014)).toBe(
    'A, B, and C have no FTE shown in Fall 2014, so they have no index; the table has their figures.',
  )
})

test('the ratio answer gives the first and last census’s ratio', () => {
  expect(ratioAnswer([56.1, null, 71], { from: 2014, to: 2025 })).toBe(
    '56.1 in Fall 2014, 71.0 in Fall 2025.',
  )
  expect(ratioAnswer([null, 71], { from: 2014, to: 2025 })).toBeNull()
})

test('the money answer gives the change in spend and who took most of a rise', () => {
  const years = { from: 2014, to: 2025 }
  expect(
    moneyAnswer(
      [
        { key: 'Faculty', changeCents: 3000, share: 0.3 },
        { key: 'Admins and professionals', changeCents: 7000, share: 0.7 },
        { key: 'All jobs', changeCents: 10_000, share: 1 },
      ],
      years,
    ),
  ).toBe(
    'Salary spend rose $100 from Fall 2014 to Fall 2025. Admins and professionals took 70.0% of the rise.',
  )
  expect(
    moneyAnswer([{ key: 'All jobs', changeCents: -500, share: 1 }], years),
  ).toBe('Salary spend fell $5 from Fall 2014 to Fall 2025.')
})

test('the split answer names the larger part', () => {
  expect(
    splitAnswer(
      {
        firstCents: 150_000,
        fteChange: 0.2,
        perFteChange: 0.4,
        volumeCents: 30_000,
        payCents: 80_000,
        changeCents: 110_000,
      },
      2014,
    ),
  ).toBe(
    'Mostly higher pay per FTE: FTE changed +20.0% and salary spend per FTE +40.0%. Of the $1,100 change in spend, $300 is the change in FTE at Fall 2014 spend per FTE and $800 is the rest.',
  )
})

test('the raises answer chains all continuing jobs over the pairs shown', () => {
  expect(
    raisesAnswer(
      [{ key: 'All continuing jobs', medians: [0.1, 0.2], chained: 0.32 }],
      [2014, 2015],
    ),
  ).toBe(
    'Chained, the median change for all continuing jobs from Fall 2014-15 to 2015-16 comes to +32.0%.',
  )
  expect(raisesAnswer([], [2014])).toBeNull()
})
