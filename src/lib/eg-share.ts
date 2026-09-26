import type { BudgetRow, BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import { publishedArea } from './areas.ts'
import { sumBy } from './department-budget.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { isClassifiedTemp, jobSpendCents } from './overview.ts'

/** BRP's OPE rate page labels fund type 11 "E&G"; the budget workbooks call it Budgeted Operations. */
export const EG_FUND_TYPE = '11'
export const SALARY_ACCOUNT_TYPES = new Set(['61', '62', '63', '64'])
const FULL_SHARE = 10_000

export const EG_SHARE_METHOD =
  "Each job's E&G share is this site's estimate for its college or VP area, not for the job: the area's E&G salary budget (fund type 11, which BRP's OPE rate page labels E&G; salary account types 61-64) over its census salary spend, capped at 100%. Grant-funded pay is in no budget, so an area paid partly from grants has a share below 100%."

function egSalaryBudgets(budget: BudgetYear): Map<string, number> {
  const areaOf = (row: BudgetRow) => publishedArea(row.org, budget.orgs)
  const rows = budget.rows.filter(
    (row) =>
      SALARY_ACCOUNT_TYPES.has(row.accountType) &&
      budget.funds[row.fund]?.fundType === EG_FUND_TYPE &&
      areaOf(row) !== null,
  )
  return sumBy(rows, (row) => areaOf(row) ?? '')
}

function shareOf(egCents: number, payCents: number): number {
  if (payCents <= 0) return 0
  const share = Math.round((egCents * FULL_SHARE) / payCents)
  return Math.min(FULL_SHARE, Math.max(0, share))
}

/** Each area's E&G share of its census pay, in basis points (0 to 10,000), from the budget the census is joined to. */
export function egShares(
  census: DepartmentCensus,
  budget: BudgetYear,
): Map<string, number> {
  const pay = new Map<string, number>()
  for (const record of census.records) {
    if (isClassifiedTemp(record)) continue
    const { area } = census.assign(record)
    if (area) pay.set(area, (pay.get(area) ?? 0) + jobSpendCents(record))
  }
  const eg = egSalaryBudgets(budget)
  return new Map(
    [...pay].map(([area, cents]) => [area, shareOf(eg.get(area) ?? 0, cents)]),
  )
}

/** A job's E&G share in basis points; 0 for a job placed in no area. */
export function egShareOf(
  record: FallRecord,
  census: DepartmentCensus,
  shares: Map<string, number>,
): number {
  const { area } = census.assign(record)
  return area ? (shares.get(area) ?? 0) : 0
}
