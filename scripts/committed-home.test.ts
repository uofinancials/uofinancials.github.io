import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { outlookSchema } from '../src/data/outlook.ts'
import { ORG_LEVEL_AREA } from '../src/lib/areas.ts'
import {
  departmentYears,
  toDepartmentCensus,
  toDepartmentCensuses,
} from '../src/lib/department-jobs.ts'
import { areaFigures } from '../src/lib/department-table.ts'
import { HAND_AREAS, type HandArea } from '../src/lib/hand-areas.ts'
import {
  headlineFigures,
  jobsByCensus,
  placementBases,
  topPaidJobs,
} from '../src/lib/home.ts'
import { isClassifiedTemp, summarize } from '../src/lib/overview.ts'
import { budgetDataPath, DATA_DIR, MANIFEST_PATH } from './scrape/cache.ts'

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function readFall2025() {
  const { records } = fallYearSchema.parse(
    readJson(path.join(DATA_DIR, 'fall', '2025.json')),
  )
  const budget = budgetYearSchema.parse(readJson(budgetDataPath(2026)))
  return { records, budget }
}

/** `main`'s published and name counts, with hand rows filling only jobs they left unplaced. */
const PLACEMENT_BASES = {
  2014: { published: 4_395, name: 1_375, hand: 311, unassigned: 30 },
  2015: { published: 4_715, name: 1_538, hand: 363, unassigned: 47 },
  2016: { published: 4_800, name: 1_453, hand: 289, unassigned: 0 },
  2017: { published: 4_890, name: 1_572, hand: 141, unassigned: 0 },
  2018: { published: 5_143, name: 1_607, hand: 142, unassigned: 0 },
  2019: { published: 5_091, name: 1_517, hand: 220, unassigned: 10 },
  2020: { published: 4_920, name: 1_528, hand: 226, unassigned: 7 },
  2021: { published: 4_433, name: 1_515, hand: 189, unassigned: 8 },
  2022: { published: 4_633, name: 1_629, hand: 178, unassigned: 10 },
  2023: { published: 4_871, name: 1_888, hand: 184, unassigned: 0 },
  2024: { published: 4_885, name: 1_912, hand: 187, unassigned: 0 },
  2025: { published: 4_896, name: 1_746, hand: 198, unassigned: 0 },
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
  'every Fall 2025 job has an area, and an area matches an independent computation',
  () => {
    const { records, budget } = readFall2025()
    const census = toDepartmentCensus({ year: 2025, records }, budget)
    const areas = areaFigures(census, budget)
    // Classified temporaries included: 4,463, 1,645, and 183 without them.
    expect(placementBases(census)).toEqual({
      published: 4_896,
      name: 1_746,
      hand: 198,
      unassigned: 0,
    })
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
  'each census places its jobs on the pinned bases, and every hand row is used in its years and names an area',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const budgets = manifest.budget.map(({ fiscalYear }) =>
      budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
    )
    const falls = manifest.fall.map(({ year }) =>
      fallYearSchema.parse(
        readJson(path.join(DATA_DIR, 'fall', `${year}.json`)),
      ),
    )
    const censuses = toDepartmentCensuses(manifest, falls, budgets)
    expect(
      Object.fromEntries(
        censuses.map((census) => [census.year, placementBases(census)]),
      ),
    ).toEqual(PLACEMENT_BASES)
    const usedRows = new Set<HandArea>()
    for (const census of censuses) {
      const rows = HAND_AREAS.filter(
        ({ from, to }) => from <= census.year && census.year <= to,
      )
      const codes = new Set(rows.map(({ code }) => code))
      expect(codes.size, `Fall ${census.year}`).toBe(rows.length)
      for (const row of rows) {
        expect(
          census.orgs[row.area]?.level,
          `${row.code} in Fall ${census.year}`,
        ).toBe(ORG_LEVEL_AREA)
        const isUsed = census.records.some(
          (record) =>
            record.payDepartment.code === row.code &&
            census.assign(record).basis === 'hand',
        )
        if (isUsed) usedRows.add(row)
      }
    }
    expect(HAND_AREAS.filter((row) => !usedRows.has(row))).toEqual([])
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
