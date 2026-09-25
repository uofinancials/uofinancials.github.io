import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { opeRatesSchema } from '../src/data/ope.ts'
import { toDepartmentCensus } from '../src/lib/department-jobs.ts'
import { egShares } from '../src/lib/eg-share.ts'
import { opeGroupOf } from '../src/lib/ope-groups.ts'
import { runScenario } from '../src/lib/scenario.ts'
import { trendGroupOf } from '../src/lib/trend-groups.ts'
import { budgetDataPath, DATA_DIR, OPE_DATA_PATH } from './scrape/cache.ts'

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function readFall(year: number) {
  return fallYearSchema.parse(
    readJson(path.join(DATA_DIR, 'fall', `${year}.json`)),
  ).records
}

function opeGroupCounts(year: number): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const record of readFall(year)) {
    const ref = opeGroupOf(record, trendGroupOf(record, year), year)
    const key = ref ? [ref.group, ref.leave].filter(Boolean).join(' ') : 'none'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

test('every job in Fall 2019-2025 maps to an OPE group, and 2019 and 2025 match an independent count', () => {
  for (let year = 2020; year <= 2024; year++) opeGroupCounts(year)
  expect(opeGroupCounts(2019)).toEqual({
    'Faculty/Staff A': 1618,
    Athletics: 261,
    'Faculty/Staff B Exec': 31,
    'Faculty/Staff B Faculty': 1644,
    'Faculty/Staff C': 390,
    'Classified Service': 444,
    'Classified Skilled/Clerical': 611,
    'Classified Technical': 490,
    none: 1349,
  })
  expect(opeGroupCounts(2025)).toEqual({
    'Faculty/Staff A': 1970,
    Athletics: 285,
    'Faculty/Staff B Exec': 34,
    'Faculty/Staff B Faculty': 1489,
    'Faculty/Staff C': 326,
    'Classified Service': 537,
    'Classified Skilled/Clerical': 636,
    'Classified Technical': 572,
    none: 991,
  })
})

const RATES = opeRatesSchema.parse(readJson(OPE_DATA_PATH))
const FY26 = budgetYearSchema.parse(readJson(budgetDataPath(2026)))
const FALL_2025 = toDepartmentCensus(
  { year: 2025, records: readFall(2025) },
  FY26,
)
const SHARES_2025 = egShares(FALL_2025, FY26)

test('Fall 2025 against the FY26 budget: $504.8M of pay, $297.2M of it E&G, and Athletics and Housing at 0%', () => {
  const { base } = runScenario({
    census: FALL_2025,
    rules: [],
    rates: RATES,
    egShares: SHARES_2025,
    opeFiscalYear: 2000,
  })
  expect(SHARES_2025.size).toBe(44)
  expect(Math.round(base.salaryCents / 10_000_000)).toBe(5_048)
  expect(Math.round(base.egCents / 10_000_000)).toBe(2_972)
  expect(SHARES_2025.get('480000')).toBe(0)
  expect(SHARES_2025.get('470000')).toBe(0)
  expect(SHARES_2025.get('222000')).toBe(8_633)
})
