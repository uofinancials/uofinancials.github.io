import { existsSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { outlookSchema } from '../src/data/outlook.ts'
import {
  departmentYears,
  toDepartmentCensus,
} from '../src/lib/department-jobs.ts'
import { areaFigures } from '../src/lib/department-table.ts'
import { headlineFigures, jobsByCensus, topPaidJobs } from '../src/lib/home.ts'
import { isClassifiedTemp, summarize } from '../src/lib/overview.ts'
import {
  budgetDataPath,
  DATA_DIR,
  MANIFEST_PATH,
  readJson,
} from './scrape/cache.ts'

function readFall2025() {
  const { records } = fallYearSchema.parse(
    readJson(path.join(DATA_DIR, 'fall', '2025.json')),
  )
  const budget = budgetYearSchema.parse(readJson(budgetDataPath(2026)))
  return { records, budget }
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'Fall 2025 totals match an independent computation',
  () => {
    const { records } = readFall2025()
    const others = records.filter((record) => !isClassifiedTemp(record))
    expect(summarize(records)).toMatchObject({
      people: 6_268,
      jobs: 6_840,
      fteHundredths: 609_943,
    })
    expect(summarize(others).spendCents).toBe(50_481_206_840)
    expect(records.length - others.length).toBe(549)
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'an area matches an independent computation',
  () => {
    const { records, budget } = readFall2025()
    const census = toDepartmentCensus({ year: 2025, records }, budget)
    const areas = areaFigures(census, budget)
    const artsJobs =
      departmentYears('222000', [census]).years.at(-1)?.records ?? []
    // The 81 units whose parent is 222000, summed in Python from FY26.json.
    expect(areas.find(({ code }) => code === '222000')).toEqual({
      code: '222000',
      name: 'Arts & Sciences, College of',
      budgetCents: 20_265_328_613,
      jobs: artsJobs.length,
      spendCents: summarize(artsJobs.filter((job) => !isClassifiedTemp(job)))
        .spendCents,
    })
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the home headlines, jobs per census, and top-paid jobs match the committed files',
  () => {
    const { records, budget } = readFall2025()
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const [projection] = outlookSchema.parse(
      readJson(path.join(DATA_DIR, 'outlook.json')),
    ).projections
    expect(
      headlineFigures({ records, budget, projection, censusFiscalYear: 2026 }),
    ).toEqual({
      runRate: { fiscalYear: 2027, cents: -2_277_059_300 },
      budgetCents: 176_850_089_471,
      spendCents: 50_481_206_840,
      people: 6_268,
    })
    expect(
      manifest.budget.find(({ fiscalYear }) => fiscalYear === 2026)
        ?.totalExpenditureBudgetCents,
    ).toBe(176_850_089_471)
    expect(jobsByCensus(manifest).map(({ jobs }) => jobs)).toEqual([
      6_111, 6_663, 6_542, 6_603, 6_892, 6_838, 6_681, 6_145, 6_450, 6_943,
      6_984, 6_840,
    ])
    const top = topPaidJobs({ year: 2025, records }, 10)
    expect(top.at(0)?.annualSalaryRateCents).toBe(940_000_000)
    expect(top.at(-1)?.annualSalaryRateCents).toBe(76_900_000)
  },
)
