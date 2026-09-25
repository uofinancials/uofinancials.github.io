import { fiscalYearLabel } from '../data/budget.ts'

/** The site's grouping of the budget's account types; UO publishes the types, not the groups. */
export const ACCOUNT_GROUPS = [
  'Salaries and pay',
  'OPE and benefits',
  'Services and supplies',
  'Student aid',
  'Other expenses',
  'Reimbursements, transfers, and reserves',
] as const

export type AccountGroup = (typeof ACCOUNT_GROUPS)[number]

const ACCOUNT_TYPE_GROUPS: Record<string, AccountGroup> = {
  '61': 'Salaries and pay',
  '62': 'Salaries and pay',
  '63': 'Salaries and pay',
  '64': 'Salaries and pay',
  '65': 'Salaries and pay',
  '66': 'Salaries and pay',
  '67': 'OPE and benefits',
  '69': 'OPE and benefits',
  '71': 'Services and supplies',
  '74': 'Student aid',
  '73': 'Other expenses',
  '75': 'Other expenses',
  '76': 'Other expenses',
  '78': 'Other expenses',
  '77': 'Reimbursements, transfers, and reserves',
  '81': 'Reimbursements, transfers, and reserves',
  '82': 'Reimbursements, transfers, and reserves',
  '89': 'Reimbursements, transfers, and reserves',
}

/** Throws on an account type the grouping does not know, so a new one cannot drop out of a total. */
export function accountGroupOf(
  accountType: string,
  fiscalYear: number,
): AccountGroup {
  const group = ACCOUNT_TYPE_GROUPS[accountType]
  if (!group) {
    throw new Error(
      `Unmapped account type "${accountType}" in the ${fiscalYearLabel(fiscalYear)} budget`,
    )
  }
  return group
}
