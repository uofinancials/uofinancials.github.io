import type { FallClassified, FallRecord } from '../../data/fall.ts'
import type { TrendGroup } from '../census/groups.ts'
import { isClassifiedTemp } from '../census/totals.ts'
import { POSTDOC_RANK, TEAMSTERS_CLASS_PREFIX } from '../trends/raise-groups.ts'

/** A group name as `ope.json` lists it, and the leave-rate line within it (`appliesTo`). */
export type OpeGroupRef = { group: string; leave: 'Faculty' | 'Exec' | null }

const ATHLETICS: OpeGroupRef = { group: 'Athletics', leave: null }
const STAFF_A: OpeGroupRef = { group: 'Faculty/Staff A', leave: null }
const STAFF_B_FACULTY: OpeGroupRef = {
  group: 'Faculty/Staff B',
  leave: 'Faculty',
}
const STAFF_B_EXEC: OpeGroupRef = { group: 'Faculty/Staff B', leave: 'Exec' }
const STAFF_C: OpeGroupRef = { group: 'Faculty/Staff C', leave: null }
const SERVICE: OpeGroupRef = { group: 'Classified Service', leave: null }
const SKILLED: OpeGroupRef = {
  group: 'Classified Skilled/Clerical',
  leave: null,
}
const TECHNICAL: OpeGroupRef = { group: 'Classified Technical', leave: null }
/** BRP's Temps group: hourly faculty and staff, and temporary support staff. */
export const TEMPS_OPE_GROUP: OpeGroupRef = { group: 'Temps', leave: null }

/** Classified EEO categories as published Fall 2019-2025, by OPE group. */
const CLASSIFIED_CATEGORY_GROUPS: Record<string, OpeGroupRef> = {
  'Service/Maint': SERVICE,
  'Service/Maint - Protective': SERVICE,
  'Protective Service': SERVICE,
  'Secy/Clerical': SKILLED,
  'Skilled Craft': SKILLED,
  'Tech/Para Prof': TECHNICAL,
  'Other Professionals': TECHNICAL,
  'First/Mid Level Admins': TECHNICAL,
}

/** BRP's Athletics group is every job under this level-3 org, whose units all start with its first two digits. */
const ATHLETICS_CODE_PREFIX = '48'
const NINE_MONTHS = 9
const HALF_TIME_PERCENT = 50

export const OPE_GROUP_METHOD =
  "Each job's OPE rate group is this site's estimate, since UO publishes no employee class: overloads carry no OPE; classified temporaries are Temps; jobs paid from Athletics (org 480000) are Athletics; position class J is Classified Technical; other classified jobs follow their EEO category (service and protective jobs to Service, clerical and skilled craft to Skilled/Clerical, technical and professional to Technical); executives and postdoctoral scholars are Faculty/Staff B, executives at the Exec leave rate; other unclassified jobs under 50% FTE are Faculty/Staff C; 9-month jobs in the faculty and ranked librarian categories are Faculty/Staff B; every other unclassified job is Faculty/Staff A."

function classifiedGroup(
  record: FallClassified,
  censusYear: number,
): OpeGroupRef {
  if (record.positionClass?.code.startsWith(TEAMSTERS_CLASS_PREFIX)) {
    return TECHNICAL
  }
  const group = CLASSIFIED_CATEGORY_GROUPS[record.eeoCategory ?? '']
  if (!group) {
    throw new Error(
      `Unmapped classified EEO category "${record.eeoCategory}" in Fall ${censusYear}`,
    )
  }
  return group
}

/** A census job's estimated OPE rate group; `null` for overloads, which carry no OPE, and classified temporaries, whose FY pay is costed at `TEMPS_OPE_GROUP` instead. */
export function opeGroupOf(
  record: FallRecord,
  group: TrendGroup,
  censusYear: number,
): OpeGroupRef | null {
  if (record.jobType === 'Overload' || isClassifiedTemp(record)) return null
  if (record.payDepartment.code?.startsWith(ATHLETICS_CODE_PREFIX)) {
    return ATHLETICS
  }
  if (record.kind === 'classified') return classifiedGroup(record, censusYear)
  if (group === 'Executives') return STAFF_B_EXEC
  if (POSTDOC_RANK.test(record.rank ?? '')) return STAFF_B_FACULTY
  if (record.apptPercent < HALF_TIME_PERCENT) return STAFF_C
  if (group === 'Faculty' && record.termOfServiceMonths === NINE_MONTHS) {
    return STAFF_B_FACULTY
  }
  return STAFF_A
}
