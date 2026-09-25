import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import * as XLSX from 'xlsx'
import type { BudgetRow, BudgetYear } from '../../src/data/budget.ts'
import { parseBudgetWorkbook, totalExpenditureCents } from './budget-file.ts'
import { parseBudgetFileName } from './budget-links.ts'
import { BUDGET_SOURCE_DIR, hasBudgetSources } from './cache.ts'

const PARSE_TIMEOUT_MS = 120_000
const PIVOT_SHEET = 'ExpndBdgt'
// Pivot totals are Excel's floating-point sums, so they are rounded, not checked for sub-cent digits.
const CENTS_PER_DOLLAR = 100
const FUND_FILTER = /^([0-9A-Z]{6}) - /
const ALL_ITEMS = '(All)'
const MULTIPLE_ITEMS = '(Multiple Items)'
// Read from xl/pivotTables/pivotTable1.xml on 2026-09-24; the cell shows only "(Multiple Items)".
const MULTIPLE_ITEM_FILTERS: Record<string, string[]> = {
  FY24: ['001100', '4369AB'],
}
const AMOUNT_KEYS = [
  'beginningBudgetCents',
  'permAdjustmentsCents',
  'permStrategicInitiativeCents',
  'totalPermBudgetCents',
  'carryForwardCents',
  'tempBudgetCents',
  'tempStrategicInitiativeCents',
  'totalTempBudgetCents',
  'totalExpenditureBudgetCents',
] as const satisfies readonly (keyof BudgetRow)[]

// Counts and totals from the research reading of the same workbooks.
const RESEARCHED: Record<string, { rows: number; totalCents: number }> = {
  FY21: { rows: 9_789, totalCents: 131_774_665_461 },
  FY22: { rows: 11_118, totalCents: 132_223_148_124 },
  FY23: { rows: 9_237, totalCents: 149_725_288_000 },
  FY24: { rows: 9_517, totalCents: 158_203_140_641 },
  FY25: { rows: 11_143, totalCents: 167_348_125_971 },
  FY26: { rows: 10_794, totalCents: 176_850_089_471 },
  FY27: { rows: 6_337, totalCents: 191_605_223_400 },
}

type Pivot = {
  period: number
  funds: string[] | null
  totalsCents: number[]
}
type Workbook = {
  label: string
  period: string
  year: BudgetYear
  pivot: Pivot
}

function filterFunds(label: string, value: unknown): string[] | null {
  if (value === undefined || value === ALL_ITEMS) return null
  if (value === MULTIPLE_ITEMS) {
    const funds = MULTIPLE_ITEM_FILTERS[label]
    if (!funds)
      throw new Error(`${label}: pivot filters to unrecorded multiple funds`)
    return funds
  }
  const code = FUND_FILTER.exec(String(value))?.[1]
  if (!code)
    throw new Error(`${label}: unreadable pivot fund filter ${String(value)}`)
  return [code]
}

function readPivot(label: string, bytes: Buffer): Pivot {
  const sheet = XLSX.read(bytes, { type: 'buffer', sheets: PIVOT_SHEET })
    .Sheets[PIVOT_SHEET]
  const rows = sheet
    ? XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: true,
        blankrows: false,
      })
    : []
  const through = rows.find((row) => row[0] === 'Through Period:')
  const filter = rows.find((row) => row[0] === 'Fund')
  const grandTotal = rows.find((row) => row[0] === 'Grand Total') ?? []
  return {
    period: Number(through?.[1]),
    funds: filterFunds(label, filter?.[1]),
    totalsCents: AMOUNT_KEYS.map((_, index) =>
      Math.round(Number(grandTotal[index + 1] ?? 0) * CENTS_PER_DOLLAR),
    ),
  }
}

function sumAmounts(rows: BudgetRow[]): number[] {
  return AMOUNT_KEYS.map((key) => rows.reduce((sum, row) => sum + row[key], 0))
}

describe.skipIf(!hasBudgetSources)('every downloaded budget workbook', () => {
  const workbooks: Workbook[] = []

  beforeAll(async () => {
    for (const name of await readdir(BUDGET_SOURCE_DIR)) {
      const file = parseBudgetFileName(name)
      if (!file) continue
      const label = `FY${String(file.fiscalYear).slice(2)}`
      const bytes = await readFile(path.join(BUDGET_SOURCE_DIR, name))
      const parse = parseBudgetWorkbook(
        new Uint8Array(bytes),
        file.fiscalYear,
        file.period,
      )
      if (parse.kind !== 'parsed') throw new Error(`${name} did not parse`)
      workbooks.push({
        label,
        period: file.period,
        year: parse.year,
        pivot: readPivot(label, bytes),
      })
    }
  }, PARSE_TIMEOUT_MS)

  test('matches the researched row counts and totals', () => {
    expect(workbooks.map((workbook) => workbook.label).sort()).toEqual(
      Object.keys(RESEARCHED),
    )
    for (const { label, year } of workbooks) {
      const totalCents = totalExpenditureCents(year.rows)
      expect({ rows: year.rows.length, totalCents }, label).toEqual(
        RESEARCHED[label],
      )
    }
  })

  test("matches the workbook's own pivot totals and period", () => {
    for (const { label, period, year, pivot } of workbooks) {
      const { funds } = pivot
      const rows = funds
        ? year.rows.filter((row) => funds.includes(row.fund))
        : year.rows
      expect(pivot.period, label).toBe(Number(period))
      expect(sumAmounts(rows), label).toEqual(pivot.totalsCents)
    }
  })
})
