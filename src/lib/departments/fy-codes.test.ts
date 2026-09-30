import { expect, test } from 'vitest'
import { census, classifiedJob } from '@/test/fall-records'
import { createFyCodeResolver, type FyCodeSources } from './fy-codes'

const paidBy = (code: string, name: string) =>
  classifiedJob({ payDepartment: { code, name } })

const SOURCES: FyCodeSources = {
  falls: [
    census(2023, [
      paidBy('100003', 'Earlier Only'),
      paidBy('100009', 'Everywhere'),
    ]),
    census(2024, [
      paidBy('100001', 'Inside'),
      paidBy('100002', 'Everywhere'),
      paidBy('100004', 'Twice'),
      paidBy('100005', 'Twice'),
    ]),
    census(2025, [paidBy('100006', 'Later Only')]),
    census(2026, [paidBy('100007', 'Too Late')]),
  ],
  budgets: [
    {
      fiscalYear: 2025,
      orgs: {
        '200001': { name: 'Budget Only', level: 5, parent: null },
        '200002': { name: 'Everywhere', level: 5, parent: null },
        '200003': { name: 'Twice', level: 5, parent: null },
      },
    },
    {
      fiscalYear: 2024,
      orgs: { '200004': { name: 'Wrong Year', level: 5, parent: null } },
    },
  ],
}

const resolve = createFyCodeResolver(2025, SOURCES)

test('tries the census inside the fiscal year, then its budget, then the censuses either side', () => {
  expect(resolve('Inside')).toEqual({ basis: 'census', code: '100001' })
  expect(resolve('Everywhere')).toEqual({ basis: 'census', code: '100002' })
  expect(resolve('Budget Only')).toEqual({ basis: 'budget', code: '200001' })
  expect(resolve('Earlier Only')).toEqual({
    basis: 'nearby census',
    code: '100003',
  })
  expect(resolve('Later Only')).toEqual({
    basis: 'nearby census',
    code: '100006',
  })
})

test('takes a reviewed name’s code over a census that gives it two', () => {
  const knightCampus = createFyCodeResolver(2021, {
    falls: [
      census(2020, [
        paidBy('110400', 'Knight Campus'),
        paidBy('110401', 'Knight Campus'),
      ]),
    ],
    budgets: [],
  })
  expect(knightCampus('Knight Campus')).toEqual({
    basis: 'reviewed',
    code: '110400',
  })
})

test('leaves a name unresolved where the first source that has it gives two codes', () => {
  expect(resolve('Twice')).toEqual({
    basis: 'unresolved',
    codes: ['100004', '100005'],
  })
})

test('reads no census or budget outside the fiscal year and its neighbours', () => {
  expect(resolve('Too Late')).toEqual({ basis: 'unresolved', codes: [] })
  expect(resolve('Wrong Year')).toEqual({ basis: 'unresolved', codes: [] })
})
