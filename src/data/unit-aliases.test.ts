import { expect, test } from 'vitest'
import { census, classifiedJob } from '@/test/fall-records'
import { AREA, budgetRow, scenarioBudget } from '@/test/scenario-fixtures'
import { PAY_CODES_WITHOUT_UNIT } from './pay-code-units'
import {
  ALL_ALIASES,
  aliasCodesOf,
  foldBudgetAliases,
  foldUnitAliases,
  unitCodeOf,
  unitCodeParam,
} from './unit-aliases'

const JOINED = ALL_ALIASES.map(({ code }) => code)

test('joins each code once, never to another alias code, and never lists a joined pay code as having no unit', () => {
  const reviewed = [...JOINED, ...PAY_CODES_WITHOUT_UNIT]
  expect(new Set(reviewed).size).toBe(reviewed.length)
  expect(ALL_ALIASES.filter(({ sameAs }) => JOINED.includes(sameAs))).toEqual(
    [],
  )
})

test('counts a joined pay code under its budget unit, in a URL search param too', () => {
  expect(unitCodeOf('223500')).toBe('223501')
  expect(aliasCodesOf('223501')).toEqual(['223500'])
  expect(unitCodeParam.parse(223500)).toBe('223501')
  expect(unitCodeParam.parse('223501')).toBe('223501')
})

const JSMA_ALIAS = '530000'
const JSMA = '531111'

test('unitCodeOf gives an alias code its unit code and leaves any other code alone', () => {
  expect(unitCodeOf(JSMA_ALIAS)).toBe(JSMA)
  expect(unitCodeOf(JSMA)).toBe(JSMA)
  expect(aliasCodesOf(JSMA)).toContain(JSMA_ALIAS)
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
