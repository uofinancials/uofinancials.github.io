import type { FallRecord } from '../data/fall.ts'
import { isClassifiedTemp } from './overview.ts'

export const TREND_GROUPS = [
  'Faculty',
  'Executives',
  'Admins and professionals',
  'Unclassified staff',
  'Classified staff',
  'Overloads',
  'Category not published',
  'Classified temporaries',
] as const

export type TrendGroup = (typeof TREND_GROUPS)[number]

/** Unclassified EEO categories as published in any census 2014-2025, by the group they belong to. */
export const UNCLASSIFIED_CATEGORY_GROUPS: Record<string, TrendGroup> = {
  Faculty: 'Faculty',
  'Librarians (Ranked)': 'Faculty',
  'Exec/Admin/Mgr': 'Executives',
  'Executive Admins': 'Executives',
  'Senior Administrators': 'Admins and professionals',
  'First/Mid Level Admins': 'Admins and professionals',
  'Other Professionals': 'Admins and professionals',
  Coaches: 'Admins and professionals',
  'Assist/Assoc Coaches': 'Admins and professionals',
  'Secy/Clerical': 'Unclassified staff',
  'Service/Maint': 'Unclassified staff',
  'Service/Maint - Protective': 'Unclassified staff',
  'Protective Service': 'Unclassified staff',
  'Skilled Craft': 'Unclassified staff',
  'Tech/Para Prof': 'Unclassified staff',
  Other: 'Unclassified staff',
}

/** The OA salary grade UO publishes for executive jobs, from Fall 2016. */
export const EXECUTIVE_GRADE = 'EXEC'

/** A job's group, stable across UO's category restructures; throws on a category no census has used. */
export function trendGroupOf(
  record: FallRecord,
  censusYear: number,
): TrendGroup {
  if (isClassifiedTemp(record)) return 'Classified temporaries'
  if (record.jobType === 'Overload') return 'Overloads'
  if (record.kind === 'classified') return 'Classified staff'
  if (record.oaSalaryGrade === EXECUTIVE_GRADE) return 'Executives'
  if (record.eeoCategory === null) return 'Category not published'
  const group = UNCLASSIFIED_CATEGORY_GROUPS[record.eeoCategory]
  if (!group) {
    throw new Error(
      `Unmapped EEO category "${record.eeoCategory}" in Fall ${censusYear}`,
    )
  }
  return group
}

export function publishedCategoriesOf(group: TrendGroup): string[] {
  return Object.entries(UNCLASSIFIED_CATEGORY_GROUPS)
    .filter(([, mapped]) => mapped === group)
    .map(([category]) => category)
}

export type GroupCounts = Record<TrendGroup, number>

export function emptyCounts(): GroupCounts {
  return {
    Faculty: 0,
    Executives: 0,
    'Admins and professionals': 0,
    'Unclassified staff': 0,
    'Classified staff': 0,
    Overloads: 0,
    'Category not published': 0,
    'Classified temporaries': 0,
  }
}

/** Each group's count per bin, for the groups with a job, with each group's place in `TREND_GROUPS`. */
export function stackedCounts(distribution: {
  counts: GroupCounts
  bins: { counts: GroupCounts }[]
}): { key: TrendGroup; values: number[]; position: number }[] {
  return TREND_GROUPS.flatMap((group, position) =>
    distribution.counts[group] === 0
      ? []
      : [
          {
            key: group,
            values: distribution.bins.map((bin) => bin.counts[group]),
            position,
          },
        ],
  )
}
