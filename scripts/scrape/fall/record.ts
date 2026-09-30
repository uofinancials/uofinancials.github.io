import {
  type FallRecord,
  fallRecordSchema,
  type StaffKind,
} from '../../../src/data/fall.ts'
import type { RawBlock } from '../pdf/blocks.ts'
import {
  checkLabels,
  describeIssue,
  fieldReader,
  parseDate,
  parseInteger,
  parsePositionClass,
} from '../pdf/fields.ts'
import { repairMojibake } from '../pdf/mojibake.ts'
import type { FallLabel } from './blocks.ts'

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

export function toFallRecord(
  block: RawBlock<FallLabel>,
  kind: StaffKind,
): FallRecord {
  checkLabels(block, LABELS_BY_KIND[kind], kind)
  const field = fieldReader(block)
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
  const candidate =
    kind === 'classified'
      ? {
          kind,
          ...common,
          jobTitle: field('JOB TITLE'),
          positionClass: parsePositionClass(field('POSITION CLASS')),
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
        }
  const parsed = fallRecordSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new Error(
      `${block.name}: ${parsed.error.issues.map(describeIssue).join('; ')}`,
    )
  }
  return parsed.data
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
