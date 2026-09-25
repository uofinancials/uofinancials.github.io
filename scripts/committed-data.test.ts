import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { identityProblems } from './scrape/budget-file.ts'
import { DATA_DIR, MANIFEST_PATH } from './scrape/cache.ts'

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
      const label = `FY${String(entry.fiscalYear).slice(2)}`
      const year = budgetYearSchema.parse(
        readJson(path.join(DATA_DIR, 'budget', `${label}.json`)),
      )
      expect(year.fiscalYear, label).toBe(entry.fiscalYear)
      expect(year.period, label).toBe(entry.period)
      expect(year.rows.length, label).toBe(entry.rows)
      expect(
        year.rows.reduce(
          (sum, row) => sum + row.totalExpenditureBudgetCents,
          0,
        ),
        label,
      ).toBe(entry.totalExpenditureBudgetCents)
      expect(year.rows.flatMap(identityProblems), label).toEqual([])
      for (const row of year.rows) {
        expect(year.orgs[row.org]?.level, `${label} org ${row.org}`).toBe(5)
        expect(year.funds[row.fund], `${label} fund ${row.fund}`).toBeDefined()
        expect(
          year.accountTypes[row.accountType],
          `${label} account ${row.accountType}`,
        ).toBeDefined()
      }
    }
  },
)
