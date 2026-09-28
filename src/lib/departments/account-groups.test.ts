import { expect, test } from 'vitest'
import { accountGroupOf } from './account-groups'

test('each account type falls in its group', () => {
  expect(accountGroupOf('61', 2026)).toBe('Salaries and pay')
  expect(accountGroupOf('66', 2026)).toBe('Salaries and pay')
  expect(accountGroupOf('69', 2026)).toBe('OPE and benefits')
  expect(accountGroupOf('71', 2026)).toBe('Services and supplies')
  expect(accountGroupOf('89', 2026)).toBe(
    'Reimbursements, transfers, and reserves',
  )
})

test('an account type the grouping does not know throws', () => {
  expect(() => accountGroupOf('99', 2026)).toThrow(
    'Unmapped account type "99" in the FY26 budget',
  )
})
