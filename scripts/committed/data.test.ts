import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../../src/data/budget.ts'
import { fallYearSchema } from '../../src/data/fall.ts'
import { fyTempsSchema } from '../../src/data/fy-temps.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import { opeRatesSchema } from '../../src/data/ope.ts'
import { raiseTermsSchema } from '../../src/data/raises.ts'
import {
  foldedBudgetYearSchema,
  foldedFallYearSchema,
} from '../../src/data/unit-aliases.ts'
import { ORG_LEVEL_AREA } from '../../src/lib/census/areas.ts'
import {
  HAND_AREAS,
  type HandArea,
  handAreasFor,
} from '../../src/lib/census/hand-areas.ts'
import { buildDistribution } from '../../src/lib/census/salary-distribution.ts'
import { isClassifiedTemp, summarize } from '../../src/lib/census/totals.ts'
import { departmentBudget } from '../../src/lib/departments/budget.ts'
import { tempsByCensus } from '../../src/lib/departments/fy-temps.ts'
import {
  departmentYears,
  toDepartmentCensuses,
} from '../../src/lib/departments/jobs.ts'
import { placementBases } from '../../src/lib/home/home.ts'
import {
  countNames,
  filterPeopleJobs,
  pageOf,
  resolvePeopleView,
  sortJobs,
} from '../../src/lib/people/list.ts'
import { peerMedianFor, peerMedians } from '../../src/lib/people/peer-median.ts'
import { findPersonLinks } from '../../src/lib/people/person-links.ts'
import { indexPeople } from '../../src/lib/people/person-lookup.ts'
import { runCards } from '../../src/lib/people/person-summary.ts'
import {
  changeCounts,
  continuingPairs,
  payChangeTrends,
} from '../../src/lib/trends/pay-changes.ts'
import {
  censusWindow,
  raiseComparison,
} from '../../src/lib/trends/raise-comparison.ts'
import { buildTrends } from '../../src/lib/trends/trends.ts'
import {
  identityProblems,
  totalExpenditureCents,
} from '../scrape/budget/file.ts'
import {
  budgetDataPath,
  FY_TEMPS_DATA_PATH,
  fallDataPath,
  MANIFEST_PATH,
  OPE_DATA_PATH,
  RAISES_DATA_PATH,
  readJson,
} from '../scrape/cache.ts'

/** Parsing and linking every census takes about five seconds alone, more beside other test files. */
const ALL_YEARS_TIMEOUT_MS = 20_000

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every committed Fall year matches its schema and its manifest entry, and the years yield the researched number of person links and runs',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const years = manifest.fall.map((entry) => {
      const year = foldedFallYearSchema.parse(
        readJson(fallDataPath(entry.year)),
      )
      const expected = entry.files.reduce((sum, file) => sum + file.records, 0)
      expect(year.censusDate).toBe(entry.censusDate)
      expect(year.records.length).toBe(expected)
      return year
    })
    expect(findPersonLinks(years)).toHaveLength(53_328)
    const people = indexPeople(years)
    const runs = people.flatMap((person) => person.runs)
    expect(people).toHaveLength(15_644)
    expect(runs).toHaveLength(19_144)
    const linked = runs.filter(({ isLinked }) => isLinked)
    expect(linked).toHaveLength(12_992)
    expect(linked.filter((run) => runCards(run).runChange)).toHaveLength(12_992)
  },
  ALL_YEARS_TIMEOUT_MS,
)

function readFyTemps() {
  return fyTempsSchema.parse(readJson(FY_TEMPS_DATA_PATH))
}

/** Every census's trends for all of UO, with classified temporaries' FY pay, as the summary builds them. */
function allOfUo(years: ReturnType<typeof loadFallCensuses>) {
  return buildTrends(
    years,
    {
      kind: 'all',
      group: null,
      dept: null,
      position: null,
      jobs: null,
      from: 2014,
      to: 2025,
    },
    tempsByCensus(readFyTemps(), { kind: 'all' }),
  )
}

function loadFallCensuses() {
  const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
  return manifest.fall.map(({ year }) => ({
    year,
    records: fallYearSchema.parse(readJson(fallDataPath(year))).records,
  }))
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every Fall year maps to trend groups, and 2014, 2015, and 2025 match an independent computation',
  () => {
    const years = loadFallCensuses()
    const yearsWithoutClass = years.filter(({ records }) =>
      records.some(
        (record) => record.kind === 'classified' && !record.positionClass,
      ),
    )
    expect(yearsWithoutClass.map(({ year }) => year)).toEqual([2015])
    const { series, total } = allOfUo(years)
    const figures = (year: number) =>
      Object.fromEntries(
        series.map(({ key, points }) => {
          const point = points.find((p) => p.year === year)
          return [key, [point?.spendCents, point?.fteHundredths]]
        }),
      )
    expect(figures(2014)).toEqual({
      Faculty: [12_574_491_957, 178_988],
      Executives: [637_281_100, 2_855],
      'Admins and professionals': [8_951_282_797, 116_334],
      'Unclassified staff': [902_120_531, 15_544],
      'Classified staff': [5_792_903_943, 151_351],
      Overloads: [709_844_782, 39_649],
      'Category not published': [null, null],
      'Classified temporaries': [null, null],
    })
    expect(figures(2015)['Classified temporaries']).toEqual([null, null])
    expect(
      series
        .find(({ key }) => key === 'Executives')
        ?.points.map(({ jobs }) => jobs),
    ).toEqual([29, 29, 33, 33, 33, 32, 34, 33, 35, 37, 33, 35])
    expect(figures(2025)).toMatchObject({
      Faculty: [18_829_315_972, 187_093],
      Executives: [1_401_753_800, 3_500],
      'Admins and professionals': [17_346_597_091, 151_733],
      'Unclassified staff': [1_538_953_523, 17_764],
      'Classified staff': [10_912_994_388, 177_208],
      Overloads: [451_592_066, 42_175],
      'Classified temporaries': [566_438_100, 11_159],
    })
    expect(
      total
        .filter((point) => [2014, 2025].includes(point.year))
        .map((point) => point.medianRateCents),
    ).toEqual([5_171_100, 7_578_700])
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'an opened group leaves spend and median blank on a point under three jobs',
  () => {
    const years = loadFallCensuses()
    const opened = buildTrends(
      years,
      {
        kind: 'all',
        group: 'Unclassified staff',
        dept: null,
        position: null,
        jobs: null,
        from: 2014,
        to: 2025,
      },
      new Map(),
    ).series
    const pointOf = (key: string, year: number) =>
      opened
        .find((line) => line.key === key)
        ?.points.find((point) => point.year === year)
    expect(pointOf('Other', 2017)).toMatchObject({
      jobs: 1,
      spendCents: null,
      medianRateCents: null,
    })
    expect(pointOf('Service/Maint - Protective', 2023)).toMatchObject({
      jobs: 1,
      spendCents: null,
      medianRateCents: null,
    })
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
  2014: { published: 4_589, name: 1_220, hand: 302, unassigned: 0 },
  2015: { published: 4_927, name: 1_379, hand: 357, unassigned: 0 },
  2016: { published: 4_812, name: 1_447, hand: 283, unassigned: 0 },
  2017: { published: 4_905, name: 1_557, hand: 141, unassigned: 0 },
  2018: { published: 5_143, name: 1_607, hand: 142, unassigned: 0 },
  2019: { published: 5_123, name: 1_485, hand: 220, unassigned: 10 },
  2020: { published: 4_949, name: 1_499, hand: 226, unassigned: 7 },
  2021: { published: 4_465, name: 1_483, hand: 189, unassigned: 8 },
  2022: { published: 4_659, name: 1_603, hand: 178, unassigned: 10 },
  2023: { published: 4_889, name: 1_870, hand: 184, unassigned: 0 },
  2024: { published: 4_896, name: 1_901, hand: 187, unassigned: 0 },
  2025: { published: 4_896, name: 1_746, hand: 198, unassigned: 0 },
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
    const usedRows = new Set<HandArea>()
    for (const census of censuses) {
      const handCodes = new Set(
        census.records
          .filter((record) => census.assign(record).basis === 'hand')
          .map((record) => record.payDepartment.code),
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
  },
  ALL_YEARS_TIMEOUT_MS,
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the Fall 2025 salary distribution matches an independent computation',
  () => {
    const { records } = fallYearSchema.parse(readJson(fallDataPath(2025)))
    const { bins, counts, maxRateCents, percentiles } = buildDistribution(
      records,
      2025,
    )
    const none = {
      Faculty: 0,
      Executives: 0,
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
      Executives: 35,
      'Admins and professionals': 1_560,
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
      Executives: 31,
      'Admins and professionals': 44,
      Overloads: 1,
      'Classified temporaries': 2,
    })
    expect(maxRateCents).toBe(940_000_000)
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the Fall 2025 people list matches an independent computation',
  () => {
    const fall2025 = loadFallCensuses().find(({ year }) => year === 2025)
    if (!fall2025) throw new Error('No Fall 2025 census')
    const { records } = fall2025
    const all = filterPeopleJobs(records, resolvePeopleView({}, [2025]))
    expect([all.length, countNames(all), pageOf(all, 1).pageCount]).toEqual([
      6_840, 6_268, 137,
    ])
    const top = resolvePeopleView(
      { min: 250_000, sort: 'rate', dir: 'desc' },
      [2025],
    )
    const high = filterPeopleJobs(records, top)
    expect([high.length, countNames(high)]).toEqual([129, 124])
    expect(sortJobs(high, top)[0]?.annualSalaryRateCents).toBe(940_000_000)
    expect(
      filterPeopleJobs(records, { ...top, category: 'Faculty' }),
    ).toHaveLength(50)
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'Fall 2025 class and rank medians match an independent computation',
  () => {
    const { censusDate, records } = fallYearSchema.parse(
      readJson(fallDataPath(2025)),
    )
    const medians = peerMedians([{ censusDate, records }])
    const analyst = records.find(
      (record) =>
        record.kind === 'classified' &&
        record.positionClass?.code === 'C1464' &&
        record.jobType === 'Primary' &&
        record.termOfServiceMonths === 12,
    )
    const professor = records.find(
      (record) =>
        record.kind === 'unclassified' &&
        record.rank === 'Professor' &&
        record.jobType === 'Primary' &&
        record.termOfServiceMonths === 9,
    )
    expect(analyst && peerMedianFor(medians, 2025, analyst)).toMatchObject({
      medianCents: 11_367_000,
      jobs: 81,
    })
    expect(professor && peerMedianFor(medians, 2025, professor)).toMatchObject({
      medianCents: 15_440_700,
      jobs: 363,
    })
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'Fall 2024-2025 pay changes match an independent computation',
  () => {
    const years = [2024, 2025].map((year) =>
      foldedFallYearSchema.parse(readJson(fallDataPath(year))),
    )
    const pairs = continuingPairs(years)
    const [all] = payChangeTrends(pairs, [2024], null)
    expect(all?.points[0]?.pairs).toBe(4_895)
    expect(all?.points[0]?.median).toBeCloseTo(0.079, 3)
    expect(changeCounts(pairs, [2024])[0]).toMatchObject({
      unclassified: 3_355,
      rankChanged: 170,
      rankUnpublished: 0,
      classified: 1_540,
      classChanged: 48,
    })
    const raises = raiseTermsSchema.parse(readJson(RAISES_DATA_PATH))
    const window = censusWindow(years, 2024)
    expect(window).toEqual({ after: '2024-11-01', through: '2025-11-01' })
    if (!window) return
    const comparison = raiseComparison(pairs, raises, window)
    const rowsByLabel = Object.fromEntries(
      comparison.rows.map(({ row, jobs, median, acrossTheBoard }) => [
        row.label,
        [jobs, median?.toFixed(4), acrossTheBoard?.basisPoints],
      ]),
    )
    expect(rowsByLabel).toMatchObject({
      'SEIU 503': [1_513, '0.1083', 661],
      'United Academics, tenure-related': [758, '0.0790', 790],
      'United Academics, pro tem, visiting, and retired': [188, '0.0659', 659],
      'Officers of Administration': [1_370, '0.0300', 300],
    })
    expect(comparison.unplaced).toBe(152)
  },
)
