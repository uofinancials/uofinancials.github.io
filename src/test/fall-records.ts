import type { FallClassified, FallUnclassified } from '@/data/fall'

const COMMON = {
  name: 'Doe, Ann',
  jobType: 'Primary',
  jobStatus: 'Active',
  jobStartDate: '2020-01-01',
  jobEndDate: null,
  homeDepartment: { code: null, name: 'Home' },
  payDepartment: { code: '111111', name: 'Dept' },
  annualSalaryRateCents: 5_000_000,
  apptPercent: 100,
  termOfServiceMonths: 12,
  sourcePage: 1,
  possibleStudent: false,
} as const

/** A classified Fall record with plain defaults, for tests. */
export function classifiedJob(
  overrides: Partial<FallClassified> = {},
): FallClassified {
  return {
    ...COMMON,
    kind: 'classified',
    eeoCategory: 'Secy/Clerical',
    jobTitle: 'Office Specialist 2',
    positionClass: { code: 'E0104', title: 'Office Specialist 2' },
    ...overrides,
  }
}

/** An unclassified Fall record with plain defaults, for tests. */
export function unclassifiedJob(
  overrides: Partial<FallUnclassified> = {},
): FallUnclassified {
  return {
    ...COMMON,
    kind: 'unclassified',
    eeoCategory: 'Faculty',
    apptStatus: 'Fixed Term',
    rank: 'Instructor',
    rankDate: null,
    academicTitle: 'Instructor',
    primaryActivity: 'Instruction',
    oaSalaryGrade: null,
    termOfServiceMonths: 9,
    ...overrides,
  }
}
