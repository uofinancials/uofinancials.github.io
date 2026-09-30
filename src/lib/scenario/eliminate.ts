import type { BudgetRow, BudgetYear } from '../../data/budget.ts'
import type { FallRecord } from '../../data/fall.ts'
import { listAreas, ORG_LEVEL_AREA } from '../census/areas.ts'
import { placeJobs } from '../census/search.ts'
import {
  type AccountGroup,
  accountGroupOf,
} from '../departments/account-groups.ts'
import { unitsOf } from '../departments/budget.ts'
import type { IndexArea } from '../departments/codes.ts'
import type { DepartmentCensus } from '../departments/jobs.ts'
import { EG_FUND_TYPE, SALARY_ACCOUNT_TYPES } from './eg-share.ts'
import { ANY_SCOPE, type Job, salaryCentsOf, scopeReach } from './jobs.ts'

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
  /** Census jobs, classified temporaries included, left out of every other rule, less those an earlier elimination took. */
  jobs: number
  eg: EliminatedLines
  egCents: number
  allFundsCents: number
  /** A unit whose census pay under its code and the codes joined to it, with its temporaries' FY pay, is under half its budgeted salaries; never an area, nor a code an earlier elimination covered. */
  isPartlyMatched: boolean
  /** Every unit the code covers was taken by an earlier elimination. */
  isCovered: boolean
}

const LINE_OF_GROUP: Partial<Record<AccountGroup, keyof EliminatedLines>> = {
  'Salaries and pay': 'payCents',
  'OPE and benefits': 'opeCents',
  'Services and supplies': 'servicesCents',
}

const PARTLY_MATCHED_DIVISOR = 2

export const ELIMINATE_METHOD =
  "An elimination saves a unit's or area's budgeted salaries and pay, OPE and benefits, and services and supplies (account types 61-67, 69, and 71) for the budget year stated, summed as published, so a negative line reduces the savings; student aid, other expenses, transfers, and reserves are not counted. The E&G figure is the budget's fund type 11, the fund the projection covers. An elimination applies before every other rule: its census jobs and its units' classified temporaries' FY pay are left out of them all, and a unit already inside an eliminated area saves nothing more. A unit's census jobs, classified temporaries included, are those whose pay department is the unit's code or a code this site joins to it by hand; the census still files some staff under codes the budget does not use and this site joins to no unit, and where a unit's census pay and its temporaries' FY pay are under half its budgeted salaries, pay rules may also count some of its staff. Savings are gross: the tuition and other revenue a department brings in is not published by department and is not counted."

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

/**
 * Marks the code's census jobs and temporaries' FY pay removed, returning how
 * many census records it newly takes, classified temporaries included, and
 * the pay placed there.
 */
function excludeJobs(
  code: string,
  census: DepartmentCensus,
  jobs: Job[],
  takenRecords: Set<FallRecord>,
) {
  let excluded = 0
  for (const record of placeJobs(census, code)) {
    if (takenRecords.has(record)) continue
    takenRecords.add(record)
    excluded += 1
  }
  const reaches = scopeReach(census, { ...ANY_SCOPE, dept: code })
  let censusPay = 0
  for (const job of jobs) {
    if (!reaches(job)) continue
    censusPay += salaryCentsOf(job)
    job.isRemoved = true
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
  const takenRecords = new Set<FallRecord>()
  return options.eliminations.map(({ code }) => {
    const covered = [...(unitsOf(code, budget.orgs) ?? [])]
    const units = new Set(covered.filter((unit) => !taken.has(unit)))
    for (const unit of units) taken.add(unit)
    const lines = sumLines(
      budget.rows.filter((row) => units.has(row.org)),
      budget,
    )
    const { excluded, censusPay } = excludeJobs(
      code,
      census,
      jobs,
      takenRecords,
    )
    const isCovered = covered.length > 0 && units.size === 0
    return {
      kind: 'eliminate',
      code,
      name: budget.orgs[code]?.name ?? code,
      isArea: budget.orgs[code]?.level === ORG_LEVEL_AREA,
      jobs: excluded,
      ...lines,
      isPartlyMatched: !isCovered && isPartlyMatched(code, budget, censusPay),
      isCovered,
    }
  })
}

/** The budget year eliminations use: the first savings year's, or the latest published before it. */
export function eliminationFiscalYear(
  published: number[],
  firstSavingsYear: number,
): number {
  const year = Math.max(
    ...published.filter((listed) => listed <= firstSavingsYear),
  )
  if (!Number.isFinite(year)) {
    throw new Error(
      `No budget is published for FY${firstSavingsYear} or before`,
    )
  }
  return year
}

/** A budget year's areas by name, each with its units by name: what an elimination can name. */
export function eliminationOptions(budget: BudgetYear): IndexArea[] {
  return listAreas(budget.orgs).map((area) => ({
    ...area,
    entries: [...(unitsOf(area.code, budget.orgs) ?? [])]
      .map((code) => ({ code, name: budget.orgs[code]?.name ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))
}
