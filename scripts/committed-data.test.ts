import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { opeRatesSchema } from '../src/data/ope.ts'
import { raiseTermsSchema } from '../src/data/raises.ts'
import { createAreaAssigner, HAND_AREAS } from '../src/lib/areas.ts'
import { departmentBudget } from '../src/lib/department-budget.ts'
import {
  departmentYears,
  toDepartmentCensuses,
} from '../src/lib/department-jobs.ts'
import {
  buildCensusOverview,
  isClassifiedTemp,
  summarize,
} from '../src/lib/overview.ts'
import { findPersonLinks } from '../src/lib/person-links.ts'
import { indexPeople } from '../src/lib/person-lookup.ts'
import { buildDistribution } from '../src/lib/salary-distribution.ts'
import { buildTrends } from '../src/lib/trends.ts'
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
  'every committed Fall year matches its schema and its manifest entry, and the years yield the researched number of person links and runs',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const years = manifest.fall.map((entry) => {
      const year = fallYearSchema.parse(
        readJson(path.join(DATA_DIR, 'fall', `${entry.year}.json`)),
      )
      const expected = entry.files.reduce((sum, file) => sum + file.records, 0)
      expect(year.censusDate).toBe(entry.censusDate)
      expect(year.records.length).toBe(expected)
      return year
    })
    expect(findPersonLinks(years)).toHaveLength(52_880)
    const people = indexPeople(years)
    const runs = people.flatMap((person) => person.runs)
    expect(people).toHaveLength(15_916)
    expect(runs).toHaveLength(19_593)
    expect(runs.filter(({ isLinked }) => isLinked)).toHaveLength(13_189)
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every Fall year maps to trend groups, and 2014, 2015, and 2025 match an independent computation',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const years = manifest.fall.map(({ year }) => ({
      year,
      records: fallYearSchema.parse(
        readJson(path.join(DATA_DIR, 'fall', `${year}.json`)),
      ).records,
    }))
    const yearsWithoutClass = years.filter(({ records }) =>
      records.some(
        (record) => record.kind === 'classified' && !record.positionClass,
      ),
    )
    expect(yearsWithoutClass.map(({ year }) => year)).toEqual([2015])
    const { series, total } = buildTrends(years, {
      kind: 'all',
      group: null,
      from: 2014,
      to: 2025,
    })
    const figures = (year: number) =>
      Object.fromEntries(
        series.map(({ key, points }) => {
          const point = points.find((p) => p.year === year)
          return [key, [point?.spendCents, point?.fteHundredths]]
        }),
      )
    expect(figures(2014)).toEqual({
      Faculty: [12_574_491_957, 178_988],
      'Admins and professionals': [9_588_563_897, 119_189],
      'Unclassified staff': [902_120_531, 15_544],
      'Classified staff': [5_792_903_943, 151_351],
      Overloads: [709_844_782, 39_649],
      'Category not published': [null, null],
      'Classified temporaries': [null, 20_541],
    })
    expect(figures(2015)['Classified temporaries']).toEqual([null, 34_406])
    expect(figures(2025)).toMatchObject({
      Faculty: [18_829_315_972, 187_093],
      'Admins and professionals': [18_748_350_891, 155_233],
      'Unclassified staff': [1_538_953_523, 17_764],
      'Classified staff': [10_912_994_388, 177_208],
      Overloads: [451_592_066, 42_175],
    })
    expect(
      total
        .filter((point) => [2014, 2025].includes(point.year))
        .map((point) => point.medianRateCents),
    ).toEqual([5_171_100, 7_578_700])
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

test.skipIf(!existsSync(MANIFEST_PATH))(
  'Fall 2025 totals match an independent computation',
  () => {
    const { records } = fallYearSchema.parse(
      readJson(path.join(DATA_DIR, 'fall', '2025.json')),
    )
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
  'every Fall 2025 job in the area table has an area, and every hand row is used',
  () => {
    const { records } = fallYearSchema.parse(
      readJson(path.join(DATA_DIR, 'fall', '2025.json')),
    )
    const { orgs } = budgetYearSchema.parse(readJson(budgetDataPath(2026)))
    expect(
      buildCensusOverview({ year: 2025, records }, orgs).areaBases,
    ).toEqual({ published: 4_463, name: 1_645, hand: 183, unassigned: 0 })
    const assign = createAreaAssigner(records, orgs, 2025)
    const handCodes = new Set(
      records
        .filter((record) => assign(record).basis === 'hand')
        .map((record) => record.payDepartment.code),
    )
    const handAreas = HAND_AREAS[2025] ?? {}
    expect([...handCodes].sort()).toEqual(Object.keys(handAreas).sort())
    for (const area of Object.values(handAreas)) {
      expect(orgs[area]?.level, area).toBe(3)
    }
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every budget year groups its account types, and a unit and an area match an independent computation',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const budgets = manifest.budget.map(({ fiscalYear }) =>
      budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
    )
    const figures = (code: string) => {
      const { years, series, total } = departmentBudget(
        code,
        budgets,
        'account',
      )
      const at = (fiscalYear: number) =>
        years.findIndex((year) => year.fiscalYear === fiscalYear)
      const pick = (key: string, fiscalYear: number) =>
        series.find((line) => line.key === key)?.values[at(fiscalYear)]
      return [2021, 2026].map((fiscalYear) => [
        total[at(fiscalYear)],
        pick('Salaries and pay', fiscalYear),
        pick('OPE and benefits', fiscalYear),
      ])
    }
    expect(figures('223100')).toEqual([
      [1_093_405_682, 601_482_401, 382_350_813],
      [988_023_540, 537_402_352, 333_722_788],
    ])
    expect(figures('222000')).toEqual([
      [16_407_516_140, 8_553_351_298, 5_969_384_786],
      [20_265_328_613, 10_721_363_144, 7_226_321_386],
    ])
    for (const budget of budgets) {
      const areas = Object.entries(budget.orgs).filter(
        ([, org]) => org.level === 3,
      )
      const areaSum = areas.reduce(
        (sum, [code]) =>
          sum + (departmentBudget(code, [budget], 'account').total[0] ?? 0),
        0,
      )
      expect(areaSum).toBe(totalExpenditureCents(budget.rows))
    }
  },
)

function readDepartmentCensuses() {
  const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
  const budgets = manifest.budget.map(({ fiscalYear }) =>
    budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
  )
  const falls = manifest.fall.map(({ year }) =>
    fallYearSchema.parse(readJson(path.join(DATA_DIR, 'fall', `${year}.json`))),
  )
  return toDepartmentCensuses(manifest, falls, budgets)
}

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
    const fall2025 = censuses.find(({ year }) => year === 2025)
    if (!fall2025) throw new Error('No Fall 2025 census')
    const overviewArts = buildCensusOverview(
      fall2025,
      fall2025.orgs,
    ).byArea.find(({ key }) => key === 'Arts & Sciences, College of')
    const artsPaid = (arts.years.at(-1)?.records ?? []).filter(
      (record) => !isClassifiedTemp(record),
    )
    expect(summarize(artsPaid)).toEqual(overviewArts?.totals)
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the Fall 2025 salary distribution matches an independent computation',
  () => {
    const { records } = fallYearSchema.parse(
      readJson(path.join(DATA_DIR, 'fall', '2025.json')),
    )
    const { bins, counts, maxRateCents, percentiles } = buildDistribution(
      records,
      2025,
    )
    const none = {
      Faculty: 0,
      'Admins and professionals': 0,
      'Unclassified staff': 0,
      'Classified staff': 0,
      Overloads: 0,
      'Category not published': 0,
      'Classified temporaries': 0,
    }
    expect(counts).toEqual({
      ...none,
      Faculty: 2_247,
      'Admins and professionals': 1_595,
      'Unclassified staff': 181,
      'Classified staff': 1_826,
      Overloads: 442,
      'Classified temporaries': 549,
    })
    expect(percentiles).toEqual({
      10: 4_749_600,
      25: 5_923_100,
      50: 7_578_700,
      75: 10_560_350,
      90: 14_855_160,
    })
    expect(bins.find((bin) => bin.floorCents === 5_000_000)?.counts).toEqual({
      ...none,
      Faculty: 164,
      'Admins and professionals': 175,
      'Unclassified staff': 24,
      'Classified staff': 399,
      Overloads: 2,
      'Classified temporaries': 79,
    })
    expect(bins.at(-1)?.counts).toEqual({
      ...none,
      Faculty: 51,
      'Admins and professionals': 75,
      Overloads: 1,
      'Classified temporaries': 2,
    })
    expect(maxRateCents).toBe(940_000_000)
  },
)
