import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, expect, test } from 'vitest'
import type { FyRecord } from '../../../src/data/fy.ts'
import { FY_SOURCE_DIR, hasFySources } from '../cache.ts'
import { parseFyFile } from './file.ts'

// Expected values are read from the rendered PDF pages, not from parser output.

const PARSE_TIMEOUT_MS = 120_000
const FILES = [
  [
    'FY2020-21 classified',
    'CLASSIFIED PERSONNEL LIST_FY Total Pay_2020-21.pdf',
  ],
  [
    'FY2025-26 classified',
    'CLASSIFIED PERSONNEL LIST_FY Total Pay_2025-26.pdf',
  ],
  [
    'FY2020-21 unclassified',
    'UNCLASSIFIED PERSONNEL LIST_FY Total Pay 2020-21.pdf',
  ],
  [
    'FY2021-22 unclassified',
    'UNCLASSIFIED PERSONNEL LIST_FY Total Pay_2021-22.pdf',
  ],
  [
    'FY2025-26 unclassified',
    'UNCLASSIFIED PERSONNEL LIST_FY Total Pay_2025-26.pdf',
  ],
] as const

type Source = (typeof FILES)[number][0]
const parsed = new Map<Source, FyRecord[]>()

const HAND_CHECKED: [Source, FyRecord][] = [
  [
    'FY2020-21 classified',
    {
      kind: 'classified',
      name: 'Aasen, Grace K',
      jobType: 'Primary',
      jobStatus: 'Terminated',
      jobStartDate: '2018-07-20',
      jobEndDate: '2020-08-01',
      homeDepartment: 'VP for Equity & Inclusion',
      jobTitle: 'OYSP Resident Advisor',
      payDepartment: 'VP for Equity & Inclusion',
      positionClass: { code: 'TS901', title: 'Temporary Non-Regular' },
      termOfServiceMonths: 12,
      totalPayCents: 67_500,
      sourcePage: 2,
    },
  ],
  [
    'FY2020-21 classified',
    {
      kind: 'classified',
      name: 'Abramowitz, Ethan S',
      jobType: 'Primary',
      jobStatus: 'Terminated',
      jobStartDate: '2020-05-01',
      jobEndDate: '2021-05-31',
      homeDepartment: 'Campus Planning and Facilities Mgmt',
      jobTitle: 'Custodian',
      payDepartment: 'Campus Planning and Facilities Mgmt',
      positionClass: { code: 'D4101', title: 'Custodian' },
      termOfServiceMonths: 12,
      totalPayCents: 153_400,
      sourcePage: 2,
    },
  ],
  [
    'FY2020-21 classified',
    {
      kind: 'classified',
      name: 'Abramowitz, Ethan S',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2021-06-01',
      jobEndDate: null,
      homeDepartment: 'University Housing',
      jobTitle: 'Custodian',
      payDepartment: 'University Housing',
      positionClass: { code: 'D4101', title: 'Custodian' },
      termOfServiceMonths: 12,
      totalPayCents: 79_400,
      sourcePage: 2,
    },
  ],
  [
    'FY2025-26 classified',
    {
      kind: 'classified',
      name: 'Aalbers, Kaylee N',
      jobType: 'Secondary',
      jobStatus: 'Active',
      jobStartDate: '2025-06-02',
      jobEndDate: null,
      homeDepartment: 'CAS Theatre Arts',
      jobTitle: 'OBF House Manager',
      payDepartment: 'SOMD Bach Festival',
      positionClass: { code: 'TS401', title: 'Temporary Office Support' },
      termOfServiceMonths: 12,
      totalPayCents: 143_300,
      sourcePage: 2,
    },
  ],
  [
    'FY2020-21 unclassified',
    {
      kind: 'unclassified',
      name: 'Aaraj, Grace M',
      jobType: 'Primary',
      jobStatus: 'Terminated',
      jobStartDate: '2020-12-16',
      jobEndDate: '2021-06-15',
      homeDepartment: 'DSGN Architecture',
      academicTitle: 'Visiting Assistant Professor',
      payDepartment: 'DSGN Architecture',
      positionClass: { code: 'FFVST', title: 'Visiting .50+ FTE' },
      termOfServiceMonths: 9,
      oaSalaryGrade: 'n/a',
      totalPayCents: 1_437_400,
      sourcePage: 2,
    },
  ],
  [
    'FY2020-21 unclassified',
    {
      kind: 'unclassified',
      name: 'Aaraj, Grace M',
      jobType: 'Overload',
      jobStatus: 'Terminated',
      jobStartDate: '2021-03-29',
      jobEndDate: '2021-03-31',
      homeDepartment: 'DSGN Architecture',
      academicTitle: 'Interim Department Head Stipen',
      payDepartment: 'CAS Geography Operations',
      positionClass: { code: 'UC202', title: 'Fixed Term Fac/Uncl 9-11mo <.5' },
      termOfServiceMonths: 9,
      oaSalaryGrade: 'n/a',
      totalPayCents: 10_100,
      sourcePage: 2,
    },
  ],
  [
    'FY2021-22 unclassified',
    {
      kind: 'unclassified',
      name: 'Ivey, Allison R',
      jobType: 'Secondary',
      jobStatus: 'Terminated',
      jobStartDate: '2021-07-01',
      jobEndDate: '2021-09-01',
      homeDepartment: 'ED Education Studies',
      academicTitle: 'ProTem Clinical Assist Prof',
      payDepartment: 'Ed OESL Oregon Educ Sci Lab',
      positionClass: { code: 'FPPTM', title: 'Pro Tempore <.50 FTE' },
      termOfServiceMonths: 9,
      oaSalaryGrade: 'n/a',
      totalPayCents: -339_400,
      sourcePage: 499,
    },
  ],
  [
    'FY2021-22 unclassified',
    {
      kind: 'unclassified',
      name: 'Speranza, Philip',
      jobType: 'Overload',
      jobStatus: 'Terminated',
      jobStartDate: '2022-03-21',
      jobEndDate: '2022-06-20',
      homeDepartment: 'DSGN Architecture',
      academicTitle: 'Overload UO Teach/Rsrch',
      payDepartment: 'DSGN Architecture',
      positionClass: { code: 'UC201', title: 'Tenure Rel Fac/Uncl 9-11mo <.5' },
      termOfServiceMonths: null,
      oaSalaryGrade: 'n/a',
      totalPayCents: 450_100,
      sourcePage: 1004,
    },
  ],
  [
    'FY2025-26 unclassified',
    {
      kind: 'unclassified',
      name: 'Abbe, Erica L',
      jobType: 'Primary',
      jobStatus: 'Terminated',
      jobStartDate: '2023-07-31',
      jobEndDate: '2026-03-02',
      homeDepartment: 'UESS Advising Operations',
      academicTitle: 'Degree Progression Manager',
      payDepartment: 'UESS Degree Progression Operations',
      positionClass: { code: 'UF301', title: 'NonteachProf/Uncl 12mo .5+' },
      termOfServiceMonths: 12,
      oaSalaryGrade: 'OA06',
      totalPayCents: 3_795_600,
      sourcePage: 2,
    },
  ],
]

beforeAll(async () => {
  if (!hasFySources) return
  for (const [source, fileName] of FILES) {
    const bytes = await readFile(path.join(FY_SOURCE_DIR, fileName))
    const fy = await parseFyFile(new Uint8Array(bytes))
    parsed.set(source, fy?.records ?? [])
  }
}, PARSE_TIMEOUT_MS)

test.skipIf(!hasFySources).each(HAND_CHECKED)(
  '%s: %o matches the rendered page',
  (source, expected) => {
    expect(parsed.get(source)).toContainEqual(expected)
  },
)
