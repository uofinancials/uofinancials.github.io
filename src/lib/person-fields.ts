import type { FallRecord, StaffKind } from '../data/fall.ts'
import { formatDollars, NO_VALUE } from './format.ts'

type Field = {
  label: string
  kind?: StaffKind
  value: (record: FallRecord) => string | null
}

function department({ code, name }: { code: string | null; name: string }) {
  return code === null ? name : `${name} (${code})`
}

const FIELDS: Field[] = [
  {
    label: 'Salary report',
    value: (record) =>
      record.kind === 'classified' ? 'Classified' : 'Unclassified',
  },
  {
    label: 'Title',
    value: (record) =>
      record.kind === 'classified' ? record.jobTitle : record.academicTitle,
  },
  {
    label: 'Position class',
    kind: 'classified',
    value: (record) =>
      record.kind === 'classified' && record.positionClass
        ? [record.positionClass.code, record.positionClass.title]
            .filter((part) => part !== null)
            .join(' ')
        : null,
  },
  {
    label: 'Rank',
    kind: 'unclassified',
    value: (record) => (record.kind === 'unclassified' ? record.rank : null),
  },
  {
    label: 'Rank date',
    kind: 'unclassified',
    value: (record) =>
      record.kind === 'unclassified' ? record.rankDate : null,
  },
  {
    label: 'Appointment status',
    kind: 'unclassified',
    value: (record) =>
      record.kind === 'unclassified' ? record.apptStatus : null,
  },
  {
    label: 'Primary activity',
    kind: 'unclassified',
    value: (record) =>
      record.kind === 'unclassified' ? record.primaryActivity : null,
  },
  {
    label: 'OA salary grade',
    kind: 'unclassified',
    value: (record) =>
      record.kind === 'unclassified' ? record.oaSalaryGrade : null,
  },
  { label: 'EEO category', value: (record) => record.eeoCategory },
  { label: 'Job type', value: (record) => record.jobType },
  { label: 'Job status', value: (record) => record.jobStatus },
  {
    label: 'Home department',
    value: (record) => department(record.homeDepartment),
  },
  {
    label: 'Pay department',
    value: (record) => department(record.payDepartment),
  },
  {
    label: 'Annual salary rate',
    value: (record) => formatDollars(record.annualSalaryRateCents),
  },
  { label: 'Appointment', value: (record) => `${record.apptPercent}%` },
  {
    label: 'Term of service',
    value: (record) => `${record.termOfServiceMonths} months`,
  },
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
