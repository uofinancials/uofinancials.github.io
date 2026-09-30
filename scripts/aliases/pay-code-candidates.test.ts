import { expect, test } from 'vitest'
import type { BudgetYear } from '../../src/data/budget.ts'
import type { FallYear } from '../../src/data/fall.ts'
import {
  classifiedJob,
  census as fallCensus,
} from '../../src/test/fall-records.ts'

import { findPayCodeCandidates } from './pay-code-candidates.ts'

const AREA = '222000'

function job(code: string, name: string) {
  return classifiedJob({ payDepartment: { code, name } })
}

function census(records: FallYear['records']): FallYear {
  return fallCensus(2025, records)
}

function budget(units: Record<string, string>): BudgetYear {
  return {
    fiscalYear: 2026,
    period: '12',
    orgs: {
      [AREA]: { name: 'Arts & Sciences, College of', level: 3, parent: null },
      ...Object.fromEntries(
        Object.entries(units).map(([code, name]) => [
          code,
          { name, level: 5, parent: AREA },
        ]),
      ),
    },
    funds: {},
    fundTypes: {},
    accountTypes: {},
    rows: [],
  }
}

test('pairs a pay code with the budget unit one code above or below it', () => {
  expect(
    findPayCodeCandidates(
      [
        census([
          job('222555', 'CAS History Operations'),
          job('223500', 'CAS Mathematics Operations'),
        ]),
      ],
      [budget({ '222554': 'CAS History', '223501': 'CAS Mathematics' })],
    ),
  ).toEqual([
    { payCode: '222555', unit: '222554', reason: 'neighbour' },
    { payCode: '223500', unit: '223501', reason: 'neighbour' },
  ])
})

test('pairs a pay code with the units on both sides of it', () => {
  expect(
    findPayCodeCandidates(
      [census([job('226507', 'Ed Program Operations')])],
      [budget({ '226506': 'Ed Program A', '226508': 'Ed Program B' })],
    ),
  ).toEqual([
    { payCode: '226507', unit: '226506', reason: 'neighbour' },
    { payCode: '226507', unit: '226508', reason: 'neighbour' },
  ])
})

test('pairs a pay code with a unit whose normalised name it shares or begins with', () => {
  expect(
    findPayCodeCandidates(
      [
        census([
          job('229100', 'SOMD Music'),
          job('264299', 'DGE CASLS Ops'),
          job('640199', 'Rsch Operations'),
        ]),
      ],
      [
        budget({
          '229611': 'SOMD Music',
          '264200': 'DGE CASLS',
          '640100': 'Rsch',
        }),
      ],
    ),
  ).toEqual([
    { payCode: '229100', unit: '229611', reason: 'same-name' },
    { payCode: '264299', unit: '264200', reason: 'name-prefix' },
  ])
})

test('leaves out pay codes any budget publishes, a unit or an area', () => {
  expect(
    findPayCodeCandidates(
      [census([job('222554', 'CAS History'), job(AREA, 'CAS Dean')])],
      [budget({ '222554': 'CAS History', '222555': 'CAS History Ops' })],
    ),
  ).toEqual([])
})

test('never pairs a pay code with an area', () => {
  expect(
    findPayCodeCandidates(
      [census([job('222001', 'Arts & Sciences, College of')])],
      [budget({})],
    ),
  ).toEqual([])
})
