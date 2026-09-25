import { expect, test } from 'vitest'
import type { FallRecord } from '@/data/fall'
import type {
  AcrossTheBoardTerm,
  EmployeeGroup,
  Population,
} from '@/data/raises'
import { census, classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { continuingPairs } from './pay-changes'
import {
  acrossTheBoard,
  censusWindow,
  raiseComparison,
} from './raise-comparison'
import { RAISE_ROWS } from './raise-groups'

function term(
  employeeGroup: EmployeeGroup,
  basisPoints: number,
  effectiveDate: string,
  populations: Population[] = ['all'],
): AcrossTheBoardTerm {
  return {
    kind: 'across-the-board',
    employeeGroup,
    appliesTo: 'Test',
    populations,
    percent: String(basisPoints / 100),
    basisPoints,
    amountCents: null,
    effectiveDate,
    effectiveBetween: null,
    note: null,
    source: {
      url: 'https://example.org/cba.pdf',
      document: 'CBA',
      location: 'p. 1',
      retrievedOn: '2026-09-24',
    },
  }
}

const rowNamed = (label: string) => {
  const row = RAISE_ROWS.find((candidate) => candidate.label === label)
  if (!row) throw new Error(label)
  return row
}
const SEIU = rowNamed('SEIU 503')
const window = (fromYear: number) => ({
  after: `${fromYear}-11-01`,
  through: `${fromYear + 1}-11-01`,
})
const SEIU_TERMS = [
  term('SEIU 503', 210, '2020-07-01'),
  term('SEIU 503', 650, '2024-04-01'),
  term('SEIU 503', 200, '2024-11-01'),
  term('SEIU 503', 350, '2025-06-01'),
  term('SEIU 503', 300, '2025-11-01'),
]

test('terms compound over the window, counting one on the later census date but not the earlier', () => {
  const basisPoints = (fromYear: number) =>
    acrossTheBoard(SEIU_TERMS, SEIU, window(fromYear))?.basisPoints
  expect(basisPoints(2019)).toBe(210)
  expect(basisPoints(2023)).toBe(863)
  expect(basisPoints(2024)).toBe(661)
  expect(acrossTheBoard(SEIU_TERMS, SEIU, window(2021))).toBeNull()
})

test('a term applies to the populations it names, and a dateless one by its window', () => {
  const ua = [
    {
      ...term('United Academics', 450, '2025-04-01'),
      effectiveDate: null,
      effectiveBetween: { from: '2025-04-01', to: '2025-05-01' },
    },
    term('United Academics', 325, '2025-09-01', [
      'tenure-related',
      'career-instructional',
      'career-research',
    ]),
    term('United Academics', 100, '2025-09-01', ['career-research']),
    term('United Academics', 200, '2025-09-01', ['pro-tem']),
  ]
  const increase = (label: string) =>
    acrossTheBoard(ua, rowNamed(label), window(2024))?.basisPoints
  expect(increase('United Academics, tenure-related')).toBe(790)
  expect(increase('United Academics, career research')).toBe(898)
  expect(increase('United Academics, pro tem, visiting, and retired')).toBe(659)
  expect(increase('SEIU 503')).toBeUndefined()
})

test('each row has its median beside the increase and the difference; rows with no job and no term are left out', () => {
  const sergeant = unclassifiedJob({ rank: 'No Rank', oaSalaryGrade: 'SGT' })
  const pairs: [FallRecord, FallRecord][] = [
    ...[5_300_000, 5_431_500, 5_500_000].map(
      (toCents): [FallRecord, FallRecord] => [
        classifiedJob(),
        classifiedJob({ annualSalaryRateCents: toCents }),
      ],
    ),
    [sergeant, sergeant],
  ]
  const years = [0, 1].map((side) =>
    census(
      2024 + side,
      pairs.map((pair, person) => ({
        ...pair[side === 0 ? 0 : 1],
        name: `P ${person}`,
      })),
    ),
  )
  const comparison = raiseComparison(
    continuingPairs(years),
    {
      terms: SEIU_TERMS,
      gaps: [
        { employeeGroup: 'SEIU 503', fiscalYears: 'FY27', note: 'Bargaining.' },
        { employeeGroup: 'UOPA', fiscalYears: 'FY27', note: 'Unpublished.' },
      ],
    },
    censusWindow(years, 2024) ?? window(0),
  )
  expect(comparison.unplaced).toBe(1)
  expect(comparison.rows).toHaveLength(1)
  const [seiu] = comparison.rows
  expect(seiu?.jobs).toBe(3)
  expect(seiu?.median).toBeCloseTo(0.0863)
  expect(seiu?.acrossTheBoard?.basisPoints).toBe(661)
  expect(seiu?.other).toBeCloseTo(0.0202)
  expect(comparison.terms.map(({ effectiveDate }) => effectiveDate)).toEqual([
    '2025-06-01',
    '2025-11-01',
  ])
  expect(comparison.gaps.map(({ employeeGroup }) => employeeGroup)).toEqual([
    'SEIU 503',
  ])
})
