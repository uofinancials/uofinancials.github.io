import type { FallClassified } from '@/data/fall'

/** A classified Fall record with plain defaults, for tests. */
export function classifiedJob(
  overrides: Partial<FallClassified> = {},
): FallClassified {
  return {
    kind: 'classified',
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
    eeoCategory: 'Secy/Clerical',
    sourcePage: 1,
    possibleStudent: false,
    jobTitle: 'Office Specialist 2',
    positionClass: { code: 'E0104', title: 'Office Specialist 2' },
    ...overrides,
  }
}
