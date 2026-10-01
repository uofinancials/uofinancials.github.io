import { expect, test } from 'vitest'
import { departmentFileSchema } from '@/data/department'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { AREA, budgetRow, scenarioBudget, UNIT } from '@/test/scenario-fixtures'
import { buildDepartmentFiles } from './department-file'
import { toDepartmentCensus } from './jobs'

const PAY_ONLY = '999999'
const biology = { code: UNIT, name: 'CAS Biology' }

const BUDGET = scenarioBudget([
  budgetRow({
    org: UNIT,
    fund: 'EG0001',
    accountType: '61',
    totalExpenditureBudgetCents: 700,
  }),
  budgetRow({
    org: UNIT,
    fund: 'GF0001',
    accountType: '71',
    totalExpenditureBudgetCents: 300,
  }),
])

const FILES = buildDepartmentFiles([AREA, UNIT, PAY_ONLY], {
  censuses: [
    toDepartmentCensus(
      {
        year: 2025,
        records: [
          unclassifiedJob({ payDepartment: biology }),
          classifiedJob({ payDepartment: biology }),
          classifiedJob({
            payDepartment: { code: PAY_ONLY, name: 'Zz Nowhere' },
          }),
        ],
      },
      BUDGET,
    ),
  ],
  budgets: [BUDGET],
  fyTemps: { years: [] },
})

const fileOf = (code: string) =>
  FILES.find(({ profile }) => profile.code === code)

test('every listed code gets a file that matches the schema', () => {
  expect(FILES.map(({ profile }) => profile.code)).toEqual([
    AREA,
    UNIT,
    PAY_ONLY,
  ])
  for (const file of FILES)
    expect(departmentFileSchema.parse(file)).toEqual(file)
})

test('a unit’s file holds its budget by both breakdowns, and its jobs for every staff kind and for each', () => {
  const unit = fileOf(UNIT)
  expect(unit?.budget).toMatchObject({
    total: [1000],
    series: {
      account: [
        { key: 'Salaries and pay', values: [700] },
        { key: 'Services and supplies', values: [300] },
      ],
      fund: [
        { key: 'Budgeted Operations', values: [700] },
        { key: 'Gift Funds - Restricted', values: [300] },
      ],
    },
  })
  expect(unit?.yearsWithJobs).toEqual([2025])
  expect(unit?.placements).toBeNull()
  expect(
    [unit?.trends.all, unit?.trends.classified, unit?.trends.unclassified].map(
      (trends) => trends?.total[0]?.jobs,
    ),
  ).toEqual([2, 1, 1])
  expect(
    unit?.classes.map(({ year, unclassified, classified }) => [
      year,
      unclassified.length,
      classified.length,
    ]),
  ).toEqual([[2025, 1, 1]])
})

test('an area’s file holds how its jobs were placed, and a pay code no budget publishes has no budget', () => {
  expect(fileOf(AREA)?.placements).toEqual([
    {
      year: 2025,
      fiscalYear: 2026,
      bases: { published: 2, name: 0, hand: 0 },
      unassignedSiteWide: 1,
    },
  ])
  expect(fileOf(AREA)?.trends.all.total[0]?.jobs).toBe(2)
  expect(fileOf(PAY_ONLY)).toMatchObject({
    profile: { name: 'Zz Nowhere', area: null },
    budget: null,
    yearsWithJobs: [2025],
  })
})
