import type { BudgetRow, BudgetYear } from '../data/budget.ts'
import { type AccountGroup, accountGroupOf } from './account-groups.ts'
import { ORG_LEVEL_AREA } from './areas.ts'
import { placeJobs } from './census-search.ts'
import { unitsOf } from './department-budget.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { EG_FUND_TYPE, SALARY_ACCOUNT_TYPES } from './eg-share.ts'
import { jobSpendCents } from './overview.ts'
import type { Job } from './scenario-jobs.ts'

export type EliminateRule = { kind: 'eliminate'; code: string }

/** E&G (fund type 11) budget cents in each saved line group. */
export type EliminatedLines = {
  payCents: number
  opeCents: number
  servicesCents: number
}

export type EliminationResult = {
  kind: 'eliminate'
  code: string
  name: string
  isArea: boolean
  /** Census jobs left out of every other rule, less those an earlier elimination took. */
  jobs: number
  eg: EliminatedLines
  egCents: number
  allFundsCents: number
  /** A unit whose census pay under its code is under half its budgeted salaries; never an area. */
  isPartlyMatched: boolean
}

const LINE_OF_GROUP: Partial<Record<AccountGroup, keyof EliminatedLines>> = {
  'Salaries and pay': 'payCents',
  'OPE and benefits': 'opeCents',
  'Services and supplies': 'servicesCents',
}

const PARTLY_MATCHED_DIVISOR = 2

export const ELIMINATE_METHOD =
  "An elimination saves a unit's or area's budgeted salaries and pay, OPE and benefits, and services and supplies (account types 61-67, 69, and 71) for the budget year stated, summed as published, so a negative line reduces the savings; student aid, other expenses, transfers, and reserves are not counted. The E&G figure is the budget's fund type 11, the fund the projection covers. An elimination applies before every other rule: its census jobs are left out of them all, and a unit already inside an eliminated area saves nothing more. A unit's census jobs are those whose pay department is the unit's code; the census files many staff under codes the budget does not use, and where a unit's census pay is under half its budgeted salaries, pay rules may also count some of its staff. Savings are gross: the tuition and other revenue a department brings in is not published by department and is not counted."

function sumLines(rows: BudgetRow[], budget: BudgetYear) {
  const eg: EliminatedLines = { payCents: 0, opeCents: 0, servicesCents: 0 }
  let allFundsCents = 0
  for (const row of rows) {
    const line =
      LINE_OF_GROUP[accountGroupOf(row.accountType, budget.fiscalYear)]
    if (!line) continue
    allFundsCents += row.totalExpenditureBudgetCents
    if (budget.funds[row.fund]?.fundType === EG_FUND_TYPE) {
      eg[line] += row.totalExpenditureBudgetCents
    }
  }
  return {
    eg,
    egCents: eg.payCents + eg.opeCents + eg.servicesCents,
    allFundsCents,
  }
}

function isPartlyMatched(code: string, budget: BudgetYear, censusPay: number) {
  if (budget.orgs[code]?.level === ORG_LEVEL_AREA) return false
  const salaryCents = budget.rows
    .filter(
      (row) => row.org === code && SALARY_ACCOUNT_TYPES.has(row.accountType),
    )
    .reduce((sum, row) => sum + row.totalExpenditureBudgetCents, 0)
  return censusPay * PARTLY_MATCHED_DIVISOR < salaryCents
}

/** Marks the code's census jobs removed, returning how many it newly removed and the census pay placed there. */
function excludeJobs(code: string, census: DepartmentCensus, jobs: Job[]) {
  const placed = new Set(placeJobs(census, code))
  let excluded = 0
  let censusPay = 0
  for (const job of jobs) {
    if (!placed.has(job.record)) continue
    censusPay += jobSpendCents(job.record)
    if (job.isRemoved) continue
    job.isRemoved = true
    excluded += 1
  }
  return { excluded, censusPay }
}

/** Each elimination's budget lines, in stack order; run before any other rule, it marks the census jobs it covers removed. */
export function eliminationSavings(options: {
  census: DepartmentCensus
  jobs: Job[]
  budget: BudgetYear
  eliminations: EliminateRule[]
}): EliminationResult[] {
  const { census, jobs, budget } = options
  const taken = new Set<string>()
  return options.eliminations.map(({ code }) => {
    const units = new Set(
      [...(unitsOf(code, budget.orgs) ?? [])].filter(
        (unit) => !taken.has(unit),
      ),
    )
    for (const unit of units) taken.add(unit)
    const lines = sumLines(
      budget.rows.filter((row) => units.has(row.org)),
      budget,
    )
    const { excluded, censusPay } = excludeJobs(code, census, jobs)
    return {
      kind: 'eliminate',
      code,
      name: budget.orgs[code]?.name ?? code,
      isArea: budget.orgs[code]?.level === ORG_LEVEL_AREA,
      jobs: excluded,
      ...lines,
      isPartlyMatched: isPartlyMatched(code, budget, censusPay),
    }
  })
}
