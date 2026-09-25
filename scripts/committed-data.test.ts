import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { opeRatesSchema } from '../src/data/ope.ts'
import { raiseTermsSchema } from '../src/data/raises.ts'
import {
  identityProblems,
  totalExpenditureCents,
} from './scrape/budget-file.ts'
import {
  budgetDataPath,
  DATA_DIR,
  MANIFEST_PATH,
  OPE_DATA_PATH,
  RAISES_DATA_PATH,
} from './scrape/cache.ts'

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every committed Fall year matches its schema and its manifest entry',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    for (const entry of manifest.fall) {
      const year = fallYearSchema.parse(
        readJson(path.join(DATA_DIR, 'fall', `${entry.year}.json`)),
      )
      const expected = entry.files.reduce((sum, file) => sum + file.records, 0)
      expect(year.censusDate).toBe(entry.censusDate)
      expect(year.records.length).toBe(expected)
    }
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every committed budget year matches its schema, identities, and manifest entry',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    for (const entry of manifest.budget) {
      const label = `FY${entry.fiscalYear}`
      const year = budgetYearSchema.parse(
        readJson(budgetDataPath(entry.fiscalYear)),
      )
      expect(year.fiscalYear, label).toBe(entry.fiscalYear)
      expect(year.period, label).toBe(entry.period)
      expect(year.rows.length, label).toBe(entry.rows)
      expect(totalExpenditureCents(year.rows), label).toBe(
        entry.totalExpenditureBudgetCents,
      )
      expect(year.rows.flatMap(identityProblems), label).toEqual([])
      const unresolved = year.rows.filter(
        (row) =>
          year.orgs[row.org]?.level !== 5 ||
          !year.funds[row.fund] ||
          !year.accountTypes[row.accountType],
      )
      expect(
        unresolved.map((row) => [row.org, row.fund, row.accountType]),
        label,
      ).toEqual([])
    }
  },
)

test.skipIf(!existsSync(OPE_DATA_PATH))(
  'the committed OPE rates match their schema and manifest entry',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const rates = opeRatesSchema.parse(readJson(OPE_DATA_PATH))
    expect(manifest.rates).toMatchObject({
      groups: rates.groups.length,
      opeRates: rates.opeRates.length,
      leaveRates: rates.leaveRates.length,
      persRepayment: rates.persRepayment.length,
    })
    const years = new Set(rates.opeRates.map((rate) => rate.fiscalYear))
    for (const year of years) {
      const groups = rates.opeRates
        .filter((rate) => rate.fiscalYear === year)
        .map((rate) => rate.group)
      expect(groups.sort(), `FY${year}`).toEqual(
        rates.groups.map((group) => group.name).sort(),
      )
    }
  },
)

test.skipIf(!existsSync(RAISES_DATA_PATH))(
  'the committed raise terms match their schema and each cites its source',
  () => {
    const { terms } = raiseTermsSchema.parse(readJson(RAISES_DATA_PATH))
    expect(terms.length).toBeGreaterThan(0)
    expect(
      terms.filter(
        (term) =>
          !term.source.location || !term.source.url.startsWith('https://'),
      ),
    ).toEqual([])
  },
)
