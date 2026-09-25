import type { FallRecord, StaffKind } from '../data/fall.ts'
import { formatDollars, NO_VALUE } from './format.ts'
import type { PeopleSort } from './people-search.ts'

type Field = {
  label: string
  kind?: StaffKind
  value: (record: FallRecord) => string | null
}

export function department({
  code,
  name,
}: {
  code: string | null
  name: string
}) {
  return code === null ? name : `${name} (${code})`
}

export function titleOf(record: FallRecord): string {
  return record.kind === 'classified' ? record.jobTitle : record.academicTitle
}

function positionClassOf(record: FallRecord): string | null {
  if (record.kind !== 'classified' || !record.positionClass) return null
  const { code, title } = record.positionClass
  return title === null ? code : `${code} ${title}`
}

const TITLE: Field = { label: 'Title', value: titleOf }
const JOB_TYPE: Field = { label: 'Job type', value: (record) => record.jobType }
const PAY_DEPARTMENT: Field = {
  label: 'Pay department',
  value: (record) => department(record.payDepartment),
}
const APPOINTMENT: Field = {
  label: 'Appointment',
  value: (record) => `${record.apptPercent}%`,
}
const TERM: Field = {
  label: 'Term of service',
  value: (record) => `${record.termOfServiceMonths} months`,
}
const CLASS_OR_RANK: Field = {
  label: 'Class or rank',
  value: (record) =>
    record.kind === 'classified' ? positionClassOf(record) : record.rank,
}

const EEO_CATEGORY: Field = {
  label: 'EEO category',
  value: (record) => record.eeoCategory,
}
const RATE: Field = {
  label: 'Annual salary rate',
  value: (record) => formatDollars(record.annualSalaryRateCents),
}

function unclassifiedField(
  label: string,
  key: 'rank' | 'rankDate' | 'apptStatus' | 'primaryActivity' | 'oaSalaryGrade',
): Field {
  return {
    label,
    kind: 'unclassified',
    value: (record) => (record.kind === 'unclassified' ? record[key] : null),
  }
}

const FIELDS: Field[] = [
  {
    label: 'Salary report',
    value: (record) =>
      record.kind === 'classified' ? 'Classified' : 'Unclassified',
  },
  TITLE,
  { label: 'Position class', kind: 'classified', value: positionClassOf },
  unclassifiedField('Rank', 'rank'),
  unclassifiedField('Rank date', 'rankDate'),
  unclassifiedField('Appointment status', 'apptStatus'),
  unclassifiedField('Primary activity', 'primaryActivity'),
  unclassifiedField('OA salary grade', 'oaSalaryGrade'),
  EEO_CATEGORY,
  JOB_TYPE,
  { label: 'Job status', value: (record) => record.jobStatus },
  {
    label: 'Home department',
    value: (record) => department(record.homeDepartment),
  },
  PAY_DEPARTMENT,
  RATE,
  APPOINTMENT,
  TERM,
  { label: 'Job start', value: (record) => record.jobStartDate },
  { label: 'Job end', value: (record) => record.jobEndDate },
  { label: 'Report page', value: (record) => String(record.sourcePage) },
]

/** The published fields that apply to the jobs' salary reports, each job's value formatted. */
export function personFields(
  records: FallRecord[],
): { label: string; values: string[] }[] {
  const kinds = new Set(records.map((record) => record.kind))
  return FIELDS.filter(({ kind }) => kind === undefined || kinds.has(kind)).map(
    ({ label, value }) => ({
      label,
      values: records.map((record) => value(record) ?? NO_VALUE),
    }),
  )
}

const HISTORY_FIELDS = [
  TITLE,
  CLASS_OR_RANK,
  PAY_DEPARTMENT,
  JOB_TYPE,
  APPOINTMENT,
  TERM,
]

export const HISTORY_LABELS = HISTORY_FIELDS.map(({ label }) => label)

/** The job history's published fields of one job, in `HISTORY_LABELS` order. */
export function historyValues(record: FallRecord): string[] {
  return HISTORY_FIELDS.map(({ value }) => value(record) ?? NO_VALUE)
}

/** The people list's columns after the name: each field, the sort it offers if any, and whether it is a number. */
export const LIST_FIELDS: (Field & {
  sort: PeopleSort | null
  isNumber: boolean
})[] = [
  { ...TITLE, sort: 'title', isNumber: false },
  { ...CLASS_OR_RANK, sort: 'position', isNumber: false },
  { ...PAY_DEPARTMENT, sort: 'dept', isNumber: false },
  { ...RATE, sort: 'rate', isNumber: true },
  { ...APPOINTMENT, sort: 'appt', isNumber: true },
  { ...TERM, sort: null, isNumber: false },
  { ...JOB_TYPE, sort: null, isNumber: false },
  { ...EEO_CATEGORY, sort: 'category', isNumber: false },
]
