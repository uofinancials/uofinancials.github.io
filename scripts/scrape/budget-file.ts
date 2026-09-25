import * as XLSX from 'xlsx'
import {
  type BudgetRow,
  type BudgetYear,
  budgetYearSchema,
} from '../../src/data/budget.ts'

const DATA_SHEET = '_5_BCs_External'
const HEADER = [
  'FISCAL_YEAR',
  'POSTING_PERIOD',
  'ORG LVL 3',
  'ORG LVL 5',
  'FT 1',
  'FT 2',
  'Fund',
  'Account Type 2',
  'Beginning Budget',
  'Perm Adjustments',
  'Perm Strategic Initiative',
  'Total Perm Budget',
  'Carry Forward',
  'Temp Budget',
  'Temp Strategic Initiative',
  'Total Temp Budget',
  'Total Expenditure Budget',
] as const
const CENTS_PER_DOLLAR = 100
const SUB_CENT_TOLERANCE = 1e-6
const ORG = /^([0-9A-Z]{6})-(.+)$/
const FUND = /^([0-9A-Z]{6}) - (.*)$/
const TWO_DIGIT = /^(\d{2})-(.+)$/

type Column = (typeof HEADER)[number]
export type BudgetRowFailure = { row: number; message: string }

export function splitCode(
  value: unknown,
  pattern: RegExp,
): { code: string; name: string } {
  const match = typeof value === 'string' ? pattern.exec(value.trim()) : null
  if (!match) throw new Error(`not a code-name value: ${JSON.stringify(value)}`)
  return { code: match[1] ?? '', name: (match[2] ?? '').trim() }
}

export function toCents(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`not an amount: ${JSON.stringify(value)}`)
  }
  const cents = value * CENTS_PER_DOLLAR
  const rounded = Math.round(cents)
  if (Math.abs(cents - rounded) > SUB_CENT_TOLERANCE) {
    throw new Error(`amount has more than two decimals: ${value}`)
  }
  return rounded
}

export function identityProblems(row: BudgetRow): string[] {
  const perm =
    row.beginningBudgetCents +
    row.permAdjustmentsCents +
    row.permStrategicInitiativeCents
  const temp =
    row.carryForwardCents +
    row.tempBudgetCents +
    row.tempStrategicInitiativeCents
  const total = row.totalPermBudgetCents + row.totalTempBudgetCents
  return [
    perm === row.totalPermBudgetCents
      ? ''
      : 'Total Perm Budget does not equal its parts',
    temp === row.totalTempBudgetCents
      ? ''
      : 'Total Temp Budget does not equal its parts',
    total === row.totalExpenditureBudgetCents
      ? ''
      : 'Total Expenditure Budget does not equal permanent plus temporary',
  ].filter(Boolean)
}

type Lookups = Pick<BudgetYear, 'orgs' | 'funds' | 'fundTypes' | 'accountTypes'>

function remember<T>(table: Record<string, T>, code: string, entry: T): void {
  const existing = table[code]
  if (
    existing !== undefined &&
    JSON.stringify(existing) !== JSON.stringify(entry)
  ) {
    throw new Error(
      `code ${code} is published as both ${JSON.stringify(existing)} and ${JSON.stringify(entry)}`,
    )
  }
  table[code] = entry
}

function readRow(
  cells: unknown[],
  fiscalYear: number,
  lookups: Lookups,
): BudgetRow {
  const cell = (column: Column) => cells[HEADER.indexOf(column)]
  const amount = (column: Column) => toCents(cell(column))
  if (String(cell('FISCAL_YEAR')) !== String(fiscalYear)) {
    throw new Error(
      `FISCAL_YEAR ${String(cell('FISCAL_YEAR'))} in an FY${fiscalYear} file`,
    )
  }
  const org3 = splitCode(cell('ORG LVL 3'), ORG)
  const org5 = splitCode(cell('ORG LVL 5'), ORG)
  const fundGroup = splitCode(cell('FT 1'), TWO_DIGIT)
  const fundType = splitCode(cell('FT 2'), TWO_DIGIT)
  const fund = splitCode(cell('Fund'), FUND)
  const account = splitCode(cell('Account Type 2'), TWO_DIGIT)
  remember(lookups.orgs, org3.code, { name: org3.name, level: 3, parent: null })
  remember(lookups.orgs, org5.code, {
    name: org5.name,
    level: 5,
    parent: org3.code,
  })
  remember(lookups.fundTypes, fundGroup.code, fundGroup.name)
  remember(lookups.fundTypes, fundType.code, fundType.name)
  remember(lookups.funds, fund.code, {
    name: fund.name,
    fundType: fundType.code,
    fundGroup: fundGroup.code,
  })
  remember(lookups.accountTypes, account.code, account.name)
  return {
    period: String(cell('POSTING_PERIOD')),
    org: org5.code,
    fund: fund.code,
    accountType: account.code,
    beginningBudgetCents: amount('Beginning Budget'),
    permAdjustmentsCents: amount('Perm Adjustments'),
    permStrategicInitiativeCents: amount('Perm Strategic Initiative'),
    totalPermBudgetCents: amount('Total Perm Budget'),
    carryForwardCents: amount('Carry Forward'),
    tempBudgetCents: amount('Temp Budget'),
    tempStrategicInitiativeCents: amount('Temp Strategic Initiative'),
    totalTempBudgetCents: amount('Total Temp Budget'),
    totalExpenditureBudgetCents: amount('Total Expenditure Budget'),
  }
}

export function parseBudgetWorkbook(
  bytes: Uint8Array,
  fiscalYear: number,
  period: string,
): { year: BudgetYear | null; failures: BudgetRowFailure[] } {
  const sheet = XLSX.read(bytes, { type: 'array' }).Sheets[DATA_SHEET]
  if (!sheet) {
    return {
      year: null,
      failures: [{ row: 0, message: `no ${DATA_SHEET} sheet` }],
    }
  }
  const [header, ...body] = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
  })
  if (JSON.stringify(header) !== JSON.stringify(HEADER)) {
    const message = `unexpected header ${JSON.stringify(header)}`
    return { year: null, failures: [{ row: 1, message }] }
  }
  const lookups: Lookups = {
    orgs: {},
    funds: {},
    fundTypes: {},
    accountTypes: {},
  }
  const rows: BudgetRow[] = []
  const failures: BudgetRowFailure[] = []
  body.forEach((cells, index) => {
    try {
      const row = readRow(cells, fiscalYear, lookups)
      const problems = identityProblems(row)
      if (problems.length > 0) throw new Error(problems.join('; '))
      rows.push(row)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ row: index + 2, message })
    }
  })
  if (failures.length > 0) return { year: null, failures }
  return {
    year: budgetYearSchema.parse({ fiscalYear, period, ...lookups, rows }),
    failures,
  }
}
