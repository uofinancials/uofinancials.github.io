import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { fyYearSchema } from '../../src/data/fy.ts'
import { fyTempsSchema } from '../../src/data/fy-temps.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import { areaTrendsSchema } from '../../src/data/summary.ts'
import {
  foldedBudgetYearSchema,
  foldedFallYearSchema,
} from '../../src/data/unit-aliases.ts'
import { isClassifiedTemp } from '../../src/lib/census/totals.ts'
import {
  departmentTrends,
  departmentYears,
  toDepartmentCensuses,
} from '../../src/lib/departments/jobs.ts'
import {
  areaTrendsPath,
  budgetDataPath,
  FY_TEMPS_DATA_PATH,
  fallDataPath,
  fyDataPath,
  MANIFEST_PATH,
  readJson,
} from '../scrape/cache.ts'

/** Reading every census and budget takes a few seconds. */
const ALL_YEARS_TIMEOUT_MS = 20_000

/** Each fiscal year's estimated temporaries' FTE, in hundredths, as `pnpm scrape summary` first derived it. */
const FTE_PINS = new Map([
  [2021, 6_665],
  [2022, 8_453],
  [2023, 8_795],
  [2024, 11_849],
  [2025, 11_882],
  [2026, 11_159],
])

test.skipIf(!existsSync(FY_TEMPS_DATA_PATH))(
  'temporaries’ FY pay by unit adds up to each FY year’s temporaries, with the pinned FTE and the known units without an area',
  () => {
    const { years } = fyTempsSchema.parse(readJson(FY_TEMPS_DATA_PATH))
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
    const figures = years.map(({ fiscalYear, censusYear, units }) => {
      const temps = fyYearSchema
        .parse(readJson(fyDataPath(fiscalYear)))
        .records.filter(isClassifiedTemp)
      return {
        fiscalYear,
        censusYear,
        jobs: sum(units.map(({ jobs }) => jobs)) - temps.length,
        payCents:
          sum(units.map(({ payCents }) => payCents)) -
          sum(temps.map(({ totalPayCents }) => totalPayCents)),
        fteHundredths: sum(units.map(({ fteHundredths }) => fteHundredths)),
        unassigned: units.flatMap(({ code, area }) => (area ? [] : [code])),
      }
    })
    expect(figures).toEqual(
      [...FTE_PINS].map(([fiscalYear, fteHundredths]) => ({
        fiscalYear,
        censusYear: fiscalYear - 1,
        jobs: 0,
        payCents: 0,
        fteHundredths,
        unassigned:
          fiscalYear === 2022 || fiscalYear === 2023
            ? ['632110']
            : fiscalYear === 2024
              ? ['410230']
              : [],
      })),
    )
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'a department page’s trends, built in the browser, equal its committed trends file, temporaries’ FY pay included',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const censuses = toDepartmentCensuses(
      manifest,
      manifest.fall.map(({ year }) =>
        foldedFallYearSchema.parse(readJson(fallDataPath(year))),
      ),
      manifest.budget.map(({ fiscalYear }) =>
        foldedBudgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
      ),
    )
    const fyTemps = fyTempsSchema.parse(readJson(FY_TEMPS_DATA_PATH))
    const pageTotals = (code: string) =>
      departmentTrends(departmentYears(code, censuses), 'all', fyTemps).total
    const athletics = areaTrendsSchema.parse(readJson(areaTrendsPath('480000')))
    const emu = areaTrendsSchema.parse(readJson(areaTrendsPath('425000')))
    const unit = emu.units.find(({ code }) => code === '267100')
    expect(pageTotals('480000')).toEqual(athletics.trends.total)
    expect(pageTotals('267100')).toEqual(unit?.trends.total)
    expect(athletics.trends.total.at(-1)?.fyTemps?.fiscalYear).toBe(2026)
  },
  ALL_YEARS_TIMEOUT_MS,
)
