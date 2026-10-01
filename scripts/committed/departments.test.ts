import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../../src/data/budget.ts'
import {
  type DepartmentFileBudget,
  departmentFileSchema,
} from '../../src/data/department.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import {
  foldedBudgetYearSchema,
  foldedFallYearSchema,
} from '../../src/data/unit-aliases.ts'
import { listAreas, ORG_LEVEL_AREA } from '../../src/lib/census/areas.ts'
import {
  HAND_AREAS,
  type HandArea,
  handAreasFor,
} from '../../src/lib/census/hand-areas.ts'
import { isClassifiedTemp, summarize } from '../../src/lib/census/totals.ts'
import { departmentBudget } from '../../src/lib/departments/budget.ts'
import {
  type DepartmentCensus,
  departmentYears,
  toDepartmentCensuses,
} from '../../src/lib/departments/jobs.ts'
import { placementBases } from '../../src/lib/home/home.ts'
import { totalExpenditureCents } from '../scrape/budget/file.ts'
import {
  budgetDataPath,
  departmentPath,
  fallDataPath,
  MANIFEST_PATH,
  readJson,
} from '../scrape/cache.ts'

/** Parsing every census takes a few seconds alone, more beside other test files. */
const ALL_YEARS_TIMEOUT_MS = 20_000

/** A committed department page, as the site reads it. */
function readPage(code: string) {
  return departmentFileSchema.parse(readJson(departmentPath(code)))
}

/** Per code, for FY21 then FY26: the total, salaries and pay, and OPE and benefits, in cents. */
const BUDGET_FIGURES = {
  '223100': [
    [1_093_405_682, 601_482_401, 382_350_813],
    [988_023_540, 537_402_352, 333_722_788],
  ],
  '222000': [
    [16_407_516_140, 8_553_351_298, 5_969_384_786],
    [20_265_328_613, 10_721_363_144, 7_226_321_386],
  ],
}

function budgetFigures({ years, total, series }: DepartmentFileBudget) {
  const at = (fiscalYear: number) =>
    years.findIndex((year) => year.fiscalYear === fiscalYear)
  const pick = (key: string, fiscalYear: number) =>
    series.account.find((line) => line.key === key)?.values[at(fiscalYear)]
  return [2021, 2026].map((fiscalYear) => [
    total[at(fiscalYear)],
    pick('Salaries and pay', fiscalYear),
    pick('OPE and benefits', fiscalYear),
  ])
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every budget year groups its account types, and a unit and an area match an independent computation',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const budgets = manifest.budget.map(({ fiscalYear }) =>
      budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
    )
    for (const [code, pinned] of Object.entries(BUDGET_FIGURES)) {
      expect(budgetFigures(departmentBudget(code, budgets)), code).toEqual(
        pinned,
      )
      const page = readPage(code).budget
      expect(page && budgetFigures(page), `${code} page`).toEqual(pinned)
    }
    for (const budget of budgets) {
      const areas = Object.entries(budget.orgs).filter(
        ([, org]) => org.level === 3,
      )
      const areaSum = areas.reduce(
        (sum, [code]) => sum + (departmentBudget(code, [budget]).total[0] ?? 0),
        0,
      )
      expect(areaSum).toBe(totalExpenditureCents(budget.rows))
    }
  },
)

/** The censuses as the department pages read them, with unit aliases folded. */
function readDepartmentCensuses() {
  const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
  const budgets = manifest.budget.map(({ fiscalYear }) =>
    foldedBudgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
  )
  const falls = manifest.fall.map(({ year }) =>
    foldedFallYearSchema.parse(readJson(fallDataPath(year))),
  )
  return toDepartmentCensuses(manifest, falls, budgets)
}

/** Each census's jobs by how they are placed, classified temporaries included. */
const PLACEMENT_BASES = {
  2014: { published: 5_747, name: 290, hand: 74, unassigned: 0 },
  2015: { published: 6_243, name: 350, hand: 70, unassigned: 0 },
  2016: { published: 6_097, name: 384, hand: 61, unassigned: 0 },
  2017: { published: 6_238, name: 355, hand: 10, unassigned: 0 },
  2018: { published: 6_465, name: 389, hand: 38, unassigned: 0 },
  2019: { published: 6_400, name: 375, hand: 53, unassigned: 10 },
  2020: { published: 6_200, name: 405, hand: 69, unassigned: 7 },
  2021: { published: 5_692, name: 384, hand: 61, unassigned: 8 },
  2022: { published: 5_942, name: 421, hand: 77, unassigned: 10 },
  2023: { published: 6_260, name: 598, hand: 85, unassigned: 0 },
  2024: { published: 6_349, name: 524, hand: 111, unassigned: 0 },
  2025: { published: 6_297, name: 439, hand: 104, unassigned: 0 },
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'each census places its jobs on the pinned bases, and every hand row is used in its years and names an area',
  () => {
    const censuses = readDepartmentCensuses()
    expect(
      Object.fromEntries(
        censuses.map((census) => [census.year, placementBases(census)]),
      ),
    ).toEqual(PLACEMENT_BASES)
    expect(pagePlacementBases(censuses)).toEqual(PLACEMENT_BASES)
    const usedRows = new Set<HandArea>()
    for (const census of censuses) {
      const handCodes = new Set(
        census.records
          .filter((record) => census.assign(record).basis === 'hand')
          .flatMap(({ payDepartment: { code, publishedCode } }) => [
            code,
            publishedCode,
          ]),
      )
      const rows = handAreasFor(census.year)
      const codes = new Set(rows.map(({ code }) => code))
      expect(codes.size, `Fall ${census.year}`).toBe(rows.length)
      for (const row of rows) {
        expect(
          census.orgs[row.area]?.level,
          `${row.code} in Fall ${census.year}`,
        ).toBe(ORG_LEVEL_AREA)
        if (handCodes.has(row.code)) usedRows.add(row)
      }
    }
    expect(HAND_AREAS.filter((row) => !usedRows.has(row))).toEqual([])
  },
  ALL_YEARS_TIMEOUT_MS,
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'Fall 2025 department jobs match an independent computation, and each census places every job in one area or none',
  () => {
    const censuses = readDepartmentCensuses()
    const latest = (code: string) => {
      const records =
        departmentYears(code, censuses).years.at(-1)?.records ?? []
      const paid = records.filter((record) => !isClassifiedTemp(record))
      return [
        records.length,
        summarize(records).fteHundredths,
        summarize(paid).spendCents,
      ]
    }
    expect(latest('229100')).toEqual([122, 10_872, 782_676_880])
    expect(latest('223100')).toEqual([63, 5_859, 538_535_028])
    expect(pageLatest('229100')).toEqual([122, 782_676_880])
    expect(pageLatest('223100')).toEqual([63, 538_535_028])
    for (const census of censuses) {
      const areas = Object.entries(census.orgs)
        .filter(([, org]) => org.level === 3)
        .map(([code]) => departmentYears(code, [census]))
      const placed = areas.reduce(
        (sum, { years }) => sum + (years[0]?.records.length ?? 0),
        0,
      )
      const unassigned = areas[0]?.placements?.[0]?.unassignedSiteWide ?? 0
      expect(placed + unassigned, `Fall ${census.year}`).toBe(
        census.records.length,
      )
    }
    const arts = departmentYears('222000', censuses)
    expect(arts.placements?.at(-1)).toMatchObject({
      year: 2025,
      fiscalYear: 2026,
    })
    expect(arts.placements?.[0]).toMatchObject({ year: 2014, fiscalYear: 2021 })
    expect(readPage('222000').placements).toEqual(arts.placements)
  },
  ALL_YEARS_TIMEOUT_MS,
)

/** Each census's jobs by basis, summed over the committed area pages, with the unassigned count each of them repeats. */
function pagePlacementBases(censuses: DepartmentCensus[]) {
  const areaCodes = new Set(
    censuses.flatMap(({ orgs }) => listAreas(orgs).map(({ code }) => code)),
  )
  const placements = [...areaCodes].flatMap(
    (code) => readPage(code).placements ?? [],
  )
  return Object.fromEntries(
    censuses.map(({ year }) => {
      const ofYear = placements.filter((placement) => placement.year === year)
      const sum = (basis: 'published' | 'name' | 'hand') =>
        ofYear.reduce((total, { bases }) => total + bases[basis], 0)
      const unassigned = new Set(
        ofYear.map(({ unassignedSiteWide }) => unassignedSiteWide),
      )
      expect(unassigned.size, `Fall ${year}`).toBe(1)
      return [
        year,
        {
          published: sum('published'),
          name: sum('name'),
          hand: sum('hand'),
          unassigned: [...unassigned][0],
        },
      ]
    }),
  )
}

/** A committed page's latest census: its jobs, and the salary spend of those that are not classified temporaries. */
function pageLatest(code: string) {
  const point = readPage(code).trends.all.total.at(-1)
  return [point?.jobs, point?.fyTemps?.otherSpendCents ?? point?.spendCents]
}
