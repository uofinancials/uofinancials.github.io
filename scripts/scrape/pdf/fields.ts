import type { FallClassified, StaffKind } from '../../../src/data/fall.ts'
import type { RawBlock } from './blocks.ts'
import { repairMojibake } from './mojibake.ts'

/** A block's field as published, mojibake repaired, or `null` when blank. */
export function fieldReader<Label extends string>(
  block: RawBlock<Label>,
): (label: Label) => string | null {
  return (label) => {
    const value = repairMojibake(block.fields.get(label) ?? '').trim()
    return value === '' ? null : value
  }
}

export function checkLabels<Label extends string>(
  block: RawBlock<Label>,
  { required, optional = [] }: { required: Label[]; optional?: Label[] },
  kind: StaffKind,
): void {
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

export function describeIssue(issue: {
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

export function parsePositionClass(
  value: string | null,
): FallClassified['positionClass'] {
  if (value === null) return null
  const match = /^([A-Z0-9]{5})(?: (.+))?$/.exec(value)
  if (!match) throw new Error(`not a position class: "${value}"`)
  return { code: match[1] ?? '', title: match[2] ?? null }
}

export function parseInteger(value: string | null): number | null {
  if (value === null) return null
  if (!/^\d+$/.test(value)) throw new Error(`not an integer: "${value}"`)
  return Number(value)
}
