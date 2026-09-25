import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, expect, test } from 'vitest'
import type {
  FallClassified,
  FallRecord,
  FallUnclassified,
} from '../../src/data/fall.ts'
import { FALL_SOURCE_DIR, hasFallSources } from './cache.ts'
import { parseFallFile } from './fall-file.ts'

// Expected values are read from the rendered PDF pages, not from parser output.

const PARSE_TIMEOUT_MS = 120_000
const FILES = [
  ['2014 classified', 'Classified103114.pdf'],
  ['2014 unclassified', 'Unclassified103114.pdf'],
  ['2015 classified', 'Classified110115.pdf'],
  ['2016 unclassified', 'Unclassified110116.pdf'],
  ['2022 unclassified', 'Unclassified 110122.pdf'],
  ['2024 classified', 'Classified 110124.pdf'],
  ['2025 classified', 'Classified 110125.pdf'],
  ['2025 unclassified', 'Unclassified 110125.pdf'],
] as const

type Source = (typeof FILES)[number][0]
const parsed = new Map<Source, FallRecord[]>()

function classified(
  record: Omit<FallClassified, 'kind' | 'possibleStudent'> &
    Partial<Pick<FallClassified, 'possibleStudent'>>,
): FallClassified {
  return { kind: 'classified', possibleStudent: false, ...record }
}

function unclassified(
  record: Omit<FallUnclassified, 'kind' | 'possibleStudent'>,
): FallUnclassified {
  return { kind: 'unclassified', possibleStudent: false, ...record }
}

const dept = (code: string | null, name: string) => ({ code, name })

const HAND_CHECKED: [Source, FallRecord][] = [
  [
    '2014 unclassified',
    unclassified({
      name: 'Abbott, David T',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2003-09-16',
      jobEndDate: '2017-06-15',
      homeDepartment: dept(null, 'SOMD Music'),
      apptStatus: 'Fixed Term',
      rank: 'Senior Instructor I',
      rankDate: '2014-09-16',
      academicTitle: 'Sr Instructor I of Double Bass',
      termOfServiceMonths: 9,
      payDepartment: dept('229100', 'SOMD Music'),
      primaryActivity: 'Instructional',
      annualSalaryRateCents: 4_327_400,
      eeoCategory: 'Faculty',
      apptPercent: 100,
      oaSalaryGrade: null,
      sourcePage: 2,
    }),
  ],
  [
    '2014 unclassified',
    unclassified({
      name: 'Abbott, David T',
      jobType: 'Overload',
      jobStatus: 'Active',
      jobStartDate: '2009-09-16',
      jobEndDate: '2015-06-15',
      homeDepartment: dept(null, 'SOMD Music'),
      apptStatus: null,
      rank: null,
      rankDate: null,
      academicTitle: 'Coord of Theory Place Stipend',
      termOfServiceMonths: 9,
      payDepartment: dept('229100', 'SOMD Music'),
      primaryActivity: 'Instructional',
      annualSalaryRateCents: 300_000,
      eeoCategory: 'Faculty',
      apptPercent: 100,
      oaSalaryGrade: null,
      sourcePage: 2,
    }),
  ],
  [
    '2014 classified',
    classified({
      name: 'Abbott, Robert K',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '1998-08-01',
      jobEndDate: null,
      homeDepartment: dept(null, 'Police Department'),
      annualSalaryRateCents: 4_356_000,
      jobTitle: 'Public Safety Officer',
      apptPercent: 100,
      payDepartment: dept('460000', 'Police Department'),
      termOfServiceMonths: 12,
      positionClass: { code: 'C5522', title: 'Campus Sec/Public Sfty Officer' },
      eeoCategory: 'Service/Maint',
      sourcePage: 2,
    }),
  ],
  [
    '2015 classified',
    classified({
      name: 'Aarons, Anna',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2015-06-22',
      jobEndDate: null,
      homeDepartment: dept(null, 'Athletics'),
      annualSalaryRateCents: 1_923_600,
      jobTitle: 'Ticket Office Intern',
      apptPercent: 49,
      payDepartment: dept('480000', 'Athletics'),
      termOfServiceMonths: 12,
      positionClass: null,
      eeoCategory: null,
      sourcePage: 2,
      possibleStudent: true,
    }),
  ],
  [
    '2016 unclassified',
    unclassified({
      name: 'Abia-Smith, Lisa M',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '1998-08-01',
      jobEndDate: null,
      homeDepartment: dept(null, 'UR JSMA'),
      apptStatus: 'Fixed Term',
      rank: 'No Rank',
      rankDate: '2003-07-01',
      academicTitle: 'Dir of Educational Outreach',
      termOfServiceMonths: 12,
      payDepartment: dept('531111', 'UR JSMA'),
      primaryActivity: 'Administrative',
      annualSalaryRateCents: 8_302_800,
      eeoCategory: 'Other Professionals',
      apptPercent: 60,
      oaSalaryGrade: 'OA07',
      sourcePage: 2,
    }),
  ],
  [
    '2022 unclassified',
    unclassified({
      name: 'Alex-Assensoh, Yvette M',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2012-08-07',
      jobEndDate: null,
      homeDepartment: dept(null, 'VP for Equity & Inclusion'),
      apptStatus: 'Fixed Term',
      rank: 'Professor',
      rankDate: '2012-09-16',
      academicTitle: 'VP for Equity and Inclusion',
      termOfServiceMonths: 12,
      payDepartment: dept('211000', 'VP for Equity & Inclusion'),
      primaryActivity: 'Administrative',
      annualSalaryRateCents: 31_930_000,
      eeoCategory: 'Executive Admins',
      apptPercent: 100,
      oaSalaryGrade: 'EXEC',
      sourcePage: 10,
    }),
  ],
  [
    '2022 unclassified',
    unclassified({
      name: 'Alex-Assensoh, Yvette M',
      jobType: 'Secondary',
      jobStatus: 'On Leave No Pay No Be',
      jobStartDate: '2012-09-16',
      jobEndDate: null,
      homeDepartment: dept(null, 'VP for Equity & Inclusion'),
      apptStatus: 'Indefinite Tenure',
      rank: 'Professor',
      rankDate: '2012-09-16',
      academicTitle: 'Professor',
      termOfServiceMonths: 9,
      payDepartment: dept('222570', 'CAS Political Science Operations'),
      primaryActivity: 'Instructional',
      annualSalaryRateCents: 21_012_200,
      eeoCategory: 'Faculty',
      apptPercent: 100,
      oaSalaryGrade: 'n/a',
      sourcePage: 10,
    }),
  ],
  [
    '2022 unclassified',
    unclassified({
      name: 'Libby, Donna J',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2022-01-01',
      jobEndDate: '2023-06-15',
      homeDepartment: dept(null, 'Ed Early Childhood CARES'),
      apptStatus: 'Fixed Term',
      rank: 'Assistant Professor, Clinical',
      rankDate: '2015-05-01',
      academicTitle: 'EI/ECSE Evaluation Specialist',
      termOfServiceMonths: 9,
      payDepartment: dept('226540', 'Ed Early Childhood CARES'),
      primaryActivity: 'Research',
      annualSalaryRateCents: 7_225_900,
      eeoCategory: 'Faculty',
      apptPercent: 0,
      oaSalaryGrade: 'n/a',
      sourcePage: 441,
    }),
  ],
  [
    '2024 classified',
    classified({
      name: 'Cutter, Christopher S',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2024-09-23',
      jobEndDate: null,
      homeDepartment: dept(null, 'Police Department'),
      annualSalaryRateCents: 5_896_700,
      jobTitle: 'Community Service Officer',
      apptPercent: 100,
      payDepartment: dept('460000', 'Police Department'),
      termOfServiceMonths: 12,
      positionClass: { code: 'D5523', title: null },
      eeoCategory: 'Service/Maint - Protective',
      sourcePage: 87,
    }),
  ],
  [
    '2025 unclassified',
    unclassified({
      name: 'Adams-Kalloch, Jenna M',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2021-02-17',
      jobEndDate: null,
      homeDepartment: dept('106003', 'Government & Community Relations'),
      apptStatus: 'Fixed Term',
      rank: 'No Rank',
      rankDate: null,
      academicTitle:
        'Senior Director of Intergovernmental Policy and Operations',
      termOfServiceMonths: 12,
      payDepartment: dept('106003', 'Government & Community Relations'),
      primaryActivity: 'Administrative',
      annualSalaryRateCents: 15_170_900,
      eeoCategory: 'First/Mid Level Admins',
      apptPercent: 100,
      oaSalaryGrade: 'OA10',
      sourcePage: 5,
    }),
  ],
  [
    '2025 unclassified',
    unclassified({
      name: 'Anderson, Regan N',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2022-09-16',
      jobEndDate: null,
      homeDepartment: dept('222565', 'CAS Linguistics Operations'),
      apptStatus: 'Fixed Term',
      rank: 'Teaching Assistant Professor',
      rankDate: '2025-07-01',
      academicTitle: 'Asst Teaching Prof of Ichishkíin',
      termOfServiceMonths: 9,
      payDepartment: dept('222565', 'CAS Linguistics Operations'),
      primaryActivity: 'Research',
      annualSalaryRateCents: 5_606_700,
      eeoCategory: 'Faculty',
      apptPercent: 33,
      oaSalaryGrade: 'n/a',
      sourcePage: 21,
    }),
  ],
  [
    '2025 classified',
    classified({
      name: '., Jepry',
      jobType: 'Primary',
      jobStatus: 'Active',
      jobStartDate: '2024-03-19',
      jobEndDate: null,
      homeDepartment: dept('470000', 'University Housing'),
      annualSalaryRateCents: 4_363_800,
      jobTitle: 'Food Service Worker 2',
      apptPercent: 100,
      payDepartment: dept('470000', 'University Housing'),
      termOfServiceMonths: 12,
      positionClass: { code: 'D9101', title: 'Food Service Worker 2' },
      eeoCategory: 'Service/Maint',
      sourcePage: 2,
    }),
  ],
]

beforeAll(async () => {
  if (!hasFallSources) return
  for (const [source, fileName] of FILES) {
    const bytes = await readFile(path.join(FALL_SOURCE_DIR, fileName))
    const { records } = await parseFallFile(new Uint8Array(bytes))
    parsed.set(source, records)
  }
}, PARSE_TIMEOUT_MS)

test.skipIf(!hasFallSources).each(HAND_CHECKED)(
  '%s: %o matches the rendered page',
  (source, expected) => {
    expect(parsed.get(source)).toContainEqual(expected)
  },
)

test.skipIf(!hasFallSources)('keeps a letter-spaced title as published', () => {
  expect(parsed.get('2025 classified')).toContainEqual(
    expect.objectContaining({
      name: 'Place, Howard D',
      jobTitle: 'S I D',
      annualSalaryRateCents: 4_160_400,
      apptPercent: 49,
      positionClass: { code: 'TS901', title: 'Temporary Non-Regular' },
      eeoCategory: 'Other/Temp',
      sourcePage: 285,
    }),
  )
})
