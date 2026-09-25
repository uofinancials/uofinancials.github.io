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

/** The job title, from whichever report published the record. */
export function titleOf(record: FallRecord): string {
  return record.kind === 'classified' ? record.jobTitle : record.academicTitle
}

function positionClassOf(record: FallRecord): string | null {
  if (record.kind !== 'classified' || !record.positionClass) return null
  const { code, title } = record.positionClass
  return title === null ? code : `${code} ${title}`
}

/** A classified job's position class or an unclassified job's rank, as published. */
export function classOrRankOf(record: FallRecord): string | null {
  return record.kind === 'classified' ? positionClassOf(record) : record.rank
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
  { label: 'Title', value: titleOf },
  { label: 'Position class', kind: 'classified', value: positionClassOf },
  unclassifiedField('Rank', 'rank'),
  unclassifiedField('Rank date', 'rankDate'),
  unclassifiedField('Appointment status', 'apptStatus'),
  unclassifiedField('Primary activity', 'primaryActivity'),
  unclassifiedField('OA salary grade', 'oaSalaryGrade'),
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
