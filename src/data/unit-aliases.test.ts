import { expect, test } from 'vitest'
import { census, classifiedJob } from '@/test/fall-records'
import { AREA, budgetRow, scenarioBudget } from '@/test/scenario-fixtures'
import {
  aliasCodesOf,
  foldBudgetAliases,
  foldUnitAliases,
  unitCodeOf,
} from './unit-aliases'

const JSMA_ALIAS = '530000'
const JSMA = '531111'

test('unitCodeOf gives an alias code its unit code and leaves any other code alone', () => {
  expect(unitCodeOf(JSMA_ALIAS)).toBe(JSMA)
  expect(unitCodeOf(JSMA)).toBe(JSMA)
  expect(aliasCodesOf(JSMA)).toEqual([JSMA_ALIAS])
})

test('folds alias pay and home department codes and keeps the published names', () => {
  const job = classifiedJob({
    payDepartment: { code: JSMA_ALIAS, name: 'UR Jordan Schnitzer Museum' },
    homeDepartment: { code: JSMA_ALIAS, name: 'UR Jordan Schnitzer Museum' },
  })
  const [folded] = foldUnitAliases(census(2015, [job])).records
  expect(folded?.payDepartment).toEqual({
    code: JSMA,
    name: 'UR Jordan Schnitzer Museum',
    publishedCode: JSMA_ALIAS,
  })
  expect(folded?.homeDepartment.code).toBe(JSMA)
})

function museumBudget(orgCodes: string[]) {
  const budget = scenarioBudget(
    orgCodes.map((org) =>
      budgetRow({
        org,
        fund: 'EG0001',
        accountType: '61',
        totalExpenditureBudgetCents: 100,
      }),
    ),
  )
  const orgs = Object.fromEntries(
    orgCodes.map((code) => [
      code,
      { name: `Museum ${code}`, level: 5 as const, parent: AREA },
    ]),
  )
  return {
    ...budget,
    orgs: {
      [AREA]: { name: 'Arts & Sciences', level: 3 as const, parent: null },
      ...orgs,
    },
  }
}

test('moves an alias org and its lines to the unit code where the unit is absent that year', () => {
  const folded = foldBudgetAliases(museumBudget([JSMA_ALIAS]))
  expect(folded.orgs[JSMA]).toEqual({
    name: `Museum ${JSMA_ALIAS}`,
    level: 5,
    parent: AREA,
  })
  expect(folded.orgs[JSMA_ALIAS]).toBeUndefined()
  expect(folded.rows.map(({ org }) => org)).toEqual([JSMA])
})

test('keeps the unit org and adds the alias lines to it where both are published', () => {
  const folded = foldBudgetAliases(museumBudget([JSMA_ALIAS, JSMA]))
  expect(folded.orgs[JSMA]?.name).toBe(`Museum ${JSMA}`)
  expect(Object.keys(folded.orgs)).toEqual([AREA, JSMA])
  expect(folded.rows.map(({ org }) => org)).toEqual([JSMA, JSMA])
})
