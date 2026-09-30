import { type BlockLayout, REPORT_CHROME } from '../pdf/blocks.ts'

const FALL_LABELS = [
  'JOB TYPE',
  'JOB STATUS',
  'JOB START DATE',
  'JOB END DATE',
  'HOME DEPARTMENT',
  'APPT STATUS',
  'RANK',
  'RANK DATE',
  'ACADEMIC TITLE',
  'JOB TITLE',
  'TERM OF SVC',
  'PAY DEPARTMENT',
  'PRIMARY ACTIVITY',
  'ANNUAL SALARY RATE',
  'EEO CATEGORY',
  'APPT PERCENT',
  'OA SALARY GRADE',
  'POSITION CLASS',
] as const

export type FallLabel = (typeof FALL_LABELS)[number]

export const CENSUS_LINE =
  /^Employees on Record (?:as of |for )?([A-Z][a-z]+) (\d{1,2}), (\d{4})/
export const FOOTER_LINE =
  /^Source: HRIS Data Warehouse, (\d{1,2}\/\d{1,2}\/\d{4})/

export const FALL_LAYOUT: BlockLayout<FallLabel> = {
  labels: FALL_LABELS,
  skip: [...REPORT_CHROME, CENSUS_LINE, FOOTER_LINE, /^NOTE: An employee/],
  aliases: [],
}
