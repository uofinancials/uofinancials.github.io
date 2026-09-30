import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import type { FyYear } from '@/data/fy'
import type { Manifest } from '@/data/manifest'
import { census, classifiedJob } from '@/test/fall-records'
import { buildFyTemps } from './fy-temps'

const TEMP_CLASS = { code: 'TS901', title: 'Temporary Non-Regular' }

function fallJob(code: string, name: string, rateCents: number, isTemp = true) {
  return classifiedJob({
    payDepartment: { code, name },
    annualSalaryRateCents: rateCents,
    ...(isTemp && { positionClass: TEMP_CLASS }),
  })
}

function fyJob(
  payDepartment: string,
  totalPayCents: number,
  positionClass: FyYear['records'][number]['positionClass'] = TEMP_CLASS,
): FyYear['records'][number] {
  return {
    kind: 'classified',
    name: 'Doe, Ann',
    jobType: 'Primary',
    jobStatus: 'Active',
    jobStartDate: '2025-01-01',
    jobEndDate: null,
    homeDepartment: payDepartment,
    payDepartment,
    positionClass,
    termOfServiceMonths: 12,
    totalPayCents,
    sourcePage: 2,
    jobTitle: 'Helper',
  }
}

const BUDGET: BudgetYear = {
  fiscalYear: 2026,
  period: '12',
  orgs: {
    '300000': { name: 'Area One', level: 3, parent: null },
    '300100': { name: 'Unit A', level: 5, parent: '300000' },
    '300200': { name: 'Unit B', level: 5, parent: '300000' },
    '300300': { name: 'Unit D', level: 5, parent: '300000' },
    '400000': { name: 'Area Two', level: 3, parent: null },
    '400100': { name: 'Unit C', level: 5, parent: '400000' },
    '500000': { name: 'Area Three', level: 3, parent: null },
    '500100': { name: 'Unit E', level: 5, parent: '500000' },
  },
  funds: {},
  fundTypes: {},
  accountTypes: {},
  rows: [],
}

const MANIFEST: Manifest = {
  fall: [],
  fy: [],
  budget: [
    {
      fiscalYear: 2026,
      period: '12',
      sourcePage: 'https://example.org',
      fileName: 'f.xlsx',
      url: 'https://example.org/f.xlsx',
      sha256: 'a'.repeat(64),
      lastModified: null,
      retrievedOn: '2026-09-24',
      rows: 0,
      totalExpenditureBudgetCents: 0,
    },
  ],
  rates: null,
  summary: null,
}

test('sums each unit’s FY pay and estimates FTE from its, its area’s, or UO’s average temporary rate', () => {
  const fyTemps = buildFyTemps({
    manifest: MANIFEST,
    falls: [
      census(2025, [
        fallJob('300100', 'Unit A', 4_000_000),
        fallJob('300100', 'Unit A', 6_000_000),
        fallJob('300200', 'Unit B', 9_900_000, false),
        fallJob('300300', 'Unit D', 11_000_000),
        fallJob('500100', 'Unit E', 1_000_000),
      ]),
    ],
    budgets: [BUDGET],
    fys: [
      {
        fiscalYear: 2026,
        records: [
          fyJob('Unit A', 6_000_000),
          fyJob('Unit A', 4_000_000),
          fyJob('Unit B', 7_000_000),
          fyJob('Unit C', 5_500_000),
          fyJob('Unit A', 9_999_900, { code: 'D0108', title: null }),
        ],
      },
    ],
  })
  expect(fyTemps).toEqual({
    years: [
      {
        fiscalYear: 2026,
        censusYear: 2025,
        units: [
          {
            code: '300100',
            area: '300000',
            jobs: 2,
            payCents: 10_000_000,
            fteHundredths: 200,
          },
          {
            code: '300200',
            area: '300000',
            jobs: 1,
            payCents: 7_000_000,
            fteHundredths: 100,
          },
          {
            code: '400100',
            area: '400000',
            jobs: 1,
            payCents: 5_500_000,
            fteHundredths: 100,
          },
        ],
      },
    ],
  })
})

test('fails on an FY department name nothing resolves', () => {
  expect(() =>
    buildFyTemps({
      manifest: MANIFEST,
      falls: [census(2025, [])],
      budgets: [BUDGET],
      fys: [{ fiscalYear: 2026, records: [fyJob('Nowhere', 100)] }],
    }),
  ).toThrow('"Nowhere"')
})
