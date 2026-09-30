import type { StaffKind } from '../../../src/data/fall.ts'
import { type FyRecord, fyRecordSchema } from '../../../src/data/fy.ts'
import {
  type BlockLayout,
  type RawBlock,
  REPORT_CHROME,
} from '../fall/blocks.ts'
import { repairMojibake } from '../fall/mojibake.ts'
import {
  checkLabels,
  describeIssue,
  fieldReader,
  parseDate,
  parseInteger,
  parsePositionClass,
} from '../fall/record.ts'

const CENTS_PER_DOLLAR = 100

const FY_LABELS = [
  'JOB TYPE',
  'JOB STATUS',
  'HOME DEPARTMENT',
  'JOB START DATE',
  'JOB END DATE',
  'JOB TITLE',
  'ACADEMIC TITLE',
  'PAY DEPARTMENT',
  'POSITION CLASS',
  'TERM OF SVC',
  'TOTAL PAY',
  'OA SALARY GRADE',
] as const

export type FyLabel = (typeof FY_LABELS)[number]

export const FY_HEADER =
  /^Employees with Pay July 1, (\d{4}) through June 30, (\d{4})$/
export const FY_FOOTER = /^Source: IDR, (\d{1,2}\/\d{1,2}\/\d{4})/

export const FY_LAYOUT: BlockLayout<FyLabel> = {
  labels: FY_LABELS,
  firstLabel: 'JOB TYPE',
  skip: [...REPORT_CHROME, FY_HEADER, FY_FOOTER, /^JOB STATUS$/],
  aliases: [
    [/^TMSHT DEPARTMENT$/, 'PAY DEPARTMENT'],
    [/^POSITION TITLE$/, 'ACADEMIC TITLE'],
    [/^as of \d{1,2}\/\d{1,2}\/\d{4}$/, 'JOB STATUS'],
  ],
}

const COMMON_LABELS: FyLabel[] = [
  'JOB TYPE',
  'JOB STATUS',
  'HOME DEPARTMENT',
  'JOB START DATE',
  'JOB END DATE',
  'PAY DEPARTMENT',
  'POSITION CLASS',
  'TERM OF SVC',
  'TOTAL PAY',
]

const LABELS_BY_KIND: Record<
  StaffKind,
  { required: FyLabel[]; optional: FyLabel[] }
> = {
  classified: { required: [...COMMON_LABELS, 'JOB TITLE'], optional: [] },
  unclassified: {
    required: [...COMMON_LABELS, 'ACADEMIC TITLE', 'OA SALARY GRADE'],
    optional: [],
  },
}

export function toFyRecord(
  block: RawBlock<FyLabel>,
  kind: StaffKind,
): FyRecord {
  checkLabels(block, LABELS_BY_KIND[kind], kind)
  const field = fieldReader(block)
  const common = {
    name: repairMojibake(block.name),
    jobType: field('JOB TYPE'),
    jobStatus: field('JOB STATUS'),
    jobStartDate: parseDate(field('JOB START DATE')),
    jobEndDate: parseDate(field('JOB END DATE')),
    homeDepartment: field('HOME DEPARTMENT'),
    payDepartment: field('PAY DEPARTMENT'),
    positionClass: parsePositionClass(field('POSITION CLASS')),
    termOfServiceMonths: parseInteger(field('TERM OF SVC')),
    totalPayCents: parsePayToCents(field('TOTAL PAY')),
    sourcePage: block.page,
  }
  const candidate =
    kind === 'classified'
      ? { kind, ...common, jobTitle: field('JOB TITLE') }
      : {
          kind,
          ...common,
          academicTitle: field('ACADEMIC TITLE'),
          oaSalaryGrade: field('OA SALARY GRADE'),
        }
  const parsed = fyRecordSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new Error(
      `${block.name}: ${parsed.error.issues.map(describeIssue).join('; ')}`,
    )
  }
  return parsed.data
}

/** Whole dollars, negative when printed in parentheses: `($3,548)`. */
export function parsePayToCents(value: string | null): number | null {
  if (value === null) return null
  const match = /^(\()?\$(\d{1,3}(?:,\d{3})*)(\))?$/.exec(value)
  if (!match || Boolean(match[1]) !== Boolean(match[3])) {
    throw new Error(`not a whole-dollar amount: "${value}"`)
  }
  const cents = Number(match[2]?.replace(/,/g, '')) * CENTS_PER_DOLLAR
  return match[1] ? -cents : cents
}
