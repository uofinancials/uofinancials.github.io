import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../../src/data/budget.ts'
import { fallYearSchema } from '../../src/data/fall.ts'
import { type FyYear, fyYearSchema } from '../../src/data/fy.ts'
import { FY_DEPARTMENTS } from '../../src/data/fy-departments.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import { isClassifiedTemp } from '../../src/lib/census/totals.ts'
import { createFyCodeResolver } from '../../src/lib/departments/fy-codes.ts'
import {
  budgetDataPath,
  fallDataPath,
  fyDataPath,
  MANIFEST_PATH,
  readJson,
} from '../scrape/cache.ts'

/** Parsing every census, budget and FY year takes a second or two. */
const ALL_YEARS_TIMEOUT_MS = 20_000

// Counted independently from the PDFs' text before the parser was written.
const PINS = [
  [2021, 2_076, 6_311, 404, 249_186_800],
  [2022, 2_599, 7_233, 650, 323_964_600],
  [2023, 2_934, 7_238, 681, 379_935_600],
  [2024, 3_041, 7_346, 777, 547_457_700],
  [2025, 2_929, 7_301, 756, 577_508_500],
  [2026, 2_805, 6_932, 727, 566_438_100],
] as const

const years = new Map<number, FyYear>()

function readYear(fiscalYear: number): FyYear {
  const year =
    years.get(fiscalYear) ??
    fyYearSchema.parse(readJson(fyDataPath(fiscalYear)))
  years.set(fiscalYear, year)
  return year
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the manifest lists each committed FY year with its record counts',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    expect(manifest.fy.map(({ fiscalYear }) => fiscalYear)).toEqual(
      PINS.map(([fiscalYear]) => fiscalYear),
    )
    for (const entry of manifest.fy) {
      const { records } = readYear(entry.fiscalYear)
      for (const file of entry.files) {
        expect(
          records.filter((record) => record.kind === file.kind).length,
          `${entry.fiscalYear} ${file.kind}`,
        ).toBe(file.records)
      }
    }
  },
)

test.skipIf(!existsSync(MANIFEST_PATH)).each(PINS)(
  'FY%i: %i classified and %i unclassified jobs; %i temporaries paid %i cents',
  (fiscalYear, classified, unclassified, temps, tempPayCents) => {
    const { records } = readYear(fiscalYear)
    const temporaries = records.filter(isClassifiedTemp)
    expect({
      classified: records.filter((record) => record.kind === 'classified')
        .length,
      unclassified: records.filter((record) => record.kind === 'unclassified')
        .length,
      temps: temporaries.length,
      tempPayCents: temporaries.reduce(
        (sum, record) => sum + record.totalPayCents,
        0,
      ),
    }).toEqual({ classified, unclassified, temps, tempPayCents })
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every FY department name resolves to one code, and every reviewed name is needed and published',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const sources = {
      falls: manifest.fall.map(({ year }) =>
        fallYearSchema.parse(readJson(fallDataPath(year))),
      ),
      budgets: manifest.budget.map(({ fiscalYear }) =>
        budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
      ),
    }
    const needed = new Set<string>()
    const unresolved = new Set<string>()
    for (const { fiscalYear } of manifest.fy) {
      const resolve = createFyCodeResolver(fiscalYear, sources)
      for (const { payDepartment } of readYear(fiscalYear).records) {
        const { basis } = resolve(payDepartment)
        if (basis === 'reviewed') needed.add(payDepartment)
        if (basis === 'unresolved') {
          unresolved.add(`FY${fiscalYear} ${payDepartment}`)
        }
      }
    }
    const published = new Set([
      ...sources.falls.flatMap(({ records }) =>
        records.flatMap(({ homeDepartment, payDepartment }) =>
          [homeDepartment.code, payDepartment.code].filter(
            (code) => code !== null,
          ),
        ),
      ),
      ...sources.budgets.flatMap(({ orgs }) => Object.keys(orgs)),
    ])
    expect([...unresolved]).toEqual([])
    expect(
      FY_DEPARTMENTS.filter(
        ({ name, code }) => !needed.has(name) || !published.has(code),
      ),
    ).toEqual([])
  },
  ALL_YEARS_TIMEOUT_MS,
)
