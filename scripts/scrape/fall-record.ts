import {
  type FallClassified,
  type FallRecord,
  fallRecordSchema,
  type StaffKind,
} from '../../src/data/fall.ts'
import type { FallLabel, RawBlock } from './fall-blocks.ts'
import { repairMojibake } from './mojibake.ts'
import { isPossibleStudent } from './possible-student.ts'

const CENTS_PER_DOLLAR = 100

const COMMON_LABELS: FallLabel[] = [
  'JOB TYPE',
  'JOB STATUS',
  'JOB START DATE',
  'JOB END DATE',
  'HOME DEPARTMENT',
  'PAY DEPARTMENT',
  'ANNUAL SALARY RATE',
  'APPT PERCENT',
  'TERM OF SVC',
  'EEO CATEGORY',
]

const LABELS_BY_KIND: Record<
  StaffKind,
  { required: FallLabel[]; optional: FallLabel[] }
> = {
  classified: {
    required: [...COMMON_LABELS, 'JOB TITLE', 'POSITION CLASS'],
    optional: [],
  },
  unclassified: {
    required: [
      ...COMMON_LABELS,
      'APPT STATUS',
      'RANK',
      'RANK DATE',
      'ACADEMIC TITLE',
      'PRIMARY ACTIVITY',
    ],
    optional: ['OA SALARY GRADE'],
  },
}

export function toFallRecord(block: RawBlock, kind: StaffKind): FallRecord {
  checkLabels(block, kind)
  const field = (label: FallLabel) => {
    const value = repairMojibake(block.fields.get(label) ?? '').trim()
    return value === '' ? null : value
  }
  const common = {
    name: repairMojibake(block.name),
    jobType: field('JOB TYPE'),
    jobStatus: field('JOB STATUS'),
    jobStartDate: parseDate(field('JOB START DATE')),
    jobEndDate: parseDate(field('JOB END DATE')),
    homeDepartment: parseDepartment(field('HOME DEPARTMENT')),
    payDepartment: parseDepartment(field('PAY DEPARTMENT')),
    annualSalaryRateCents: parseDollarsToCents(field('ANNUAL SALARY RATE')),
    apptPercent: parsePercent(field('APPT PERCENT')),
    termOfServiceMonths: parseInteger(field('TERM OF SVC')),
    eeoCategory: field('EEO CATEGORY'),
    sourcePage: block.page,
  }
  const positionClass = parsePositionClass(field('POSITION CLASS'))
  const candidate =
    kind === 'classified'
      ? {
          kind,
          ...common,
          jobTitle: field('JOB TITLE'),
          positionClass,
          possibleStudent: isPossibleStudent([
            field('JOB TITLE'),
            positionClass?.title ?? null,
          ]),
        }
      : {
          kind,
          ...common,
          apptStatus: field('APPT STATUS'),
          rank: field('RANK'),
          rankDate: parseDate(field('RANK DATE')),
          academicTitle: field('ACADEMIC TITLE'),
          primaryActivity: field('PRIMARY ACTIVITY'),
          oaSalaryGrade: field('OA SALARY GRADE'),
          possibleStudent: isPossibleStudent([field('ACADEMIC TITLE')]),
        }
  const parsed = fallRecordSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new Error(
      `${block.name}: ${parsed.error.issues.map(describeIssue).join('; ')}`,
    )
  }
  return parsed.data
}

function checkLabels(block: RawBlock, kind: StaffKind): void {
  const { required, optional } = LABELS_BY_KIND[kind]
  const missing = required.filter((label) => !block.fields.has(label))
  const unexpected = [...block.fields.keys()].filter(
    (label) => !required.includes(label) && !optional.includes(label),
  )
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${block.name}: missing [${missing.join(', ')}], unexpected [${unexpected.join(', ')}] for ${kind}`,
    )
  }
}

function describeIssue(issue: {
  path: PropertyKey[]
  message: string
}): string {
  return `${issue.path.map(String).join('.')}: ${issue.message}`
}

export function isoDate(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function parseDate(value: string | null): string | null {
  if (value === null) return null
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  if (!match) throw new Error(`not a M/D/YYYY date: "${value}"`)
  const [, month = '', day = '', year = ''] = match
  return isoDate(year, month, day)
}

function parseDepartment(
  value: string | null,
): FallRecord['payDepartment'] | null {
  if (value === null) return null
  const match = /^(\d{6}) (.+)$/.exec(value)
  return match
    ? { code: match[1] ?? null, name: match[2] ?? '' }
    : { code: null, name: value }
}

function parsePositionClass(
  value: string | null,
): FallClassified['positionClass'] {
  if (value === null) return null
  const match = /^([A-Z0-9]{5})(?: (.+))?$/.exec(value)
  if (!match) throw new Error(`not a position class: "${value}"`)
  return { code: match[1] ?? '', title: match[2] ?? null }
}

function parseDollarsToCents(value: string | null): number | null {
  if (value === null) return null
  if (!/^\$\d{1,3}(,\d{3})*$/.test(value)) {
    throw new Error(`not a whole-dollar amount: "${value}"`)
  }
  return Number(value.replace(/[$,]/g, '')) * CENTS_PER_DOLLAR
}

function parsePercent(value: string | null): number | null {
  if (value === null) return null
  const match = /^(\d{1,3})%$/.exec(value)
  if (!match) throw new Error(`not a percentage: "${value}"`)
  return Number(match[1])
}

function parseInteger(value: string | null): number | null {
  if (value === null) return null
  if (!/^\d+$/.test(value)) throw new Error(`not an integer: "${value}"`)
  return Number(value)
}
