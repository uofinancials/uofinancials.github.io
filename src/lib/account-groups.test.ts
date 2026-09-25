import { expect, test } from 'vitest'
import { accountGroupOf, accountTypesOf } from './account-groups'

test('each account type falls in its group', () => {
  expect(accountGroupOf('61', 2026)).toBe('Salaries and pay')
  expect(accountGroupOf('66', 2026)).toBe('Salaries and pay')
  expect(accountGroupOf('69', 2026)).toBe('OPE and benefits')
  expect(accountGroupOf('71', 2026)).toBe('Services and supplies')
  expect(accountGroupOf('89', 2026)).toBe(
    'Reimbursements, transfers, and reserves',
  )
  expect(accountTypesOf('OPE and benefits')).toEqual(['67', '69'])
  expect(accountTypesOf('Other expenses')).toEqual(['73', '75', '76', '78'])
})

test('an account type the grouping does not know throws', () => {
  expect(() => accountGroupOf('99', 2026)).toThrow(
    'Unmapped account type "99" in the FY26 budget',
  )
})
