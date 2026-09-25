import type {
  FallClassified,
  FallRecord,
  FallUnclassified,
} from '../data/fall.ts'
import type { EmployeeGroup, Population } from '../data/raises.ts'
import { isClassifiedTemp } from './overview.ts'
import type { TrendGroup } from './trend-groups.ts'

/** One row of the raise comparison: a raise employee group, or the part of one that a cited term names. */
export type RaiseRow = {
  group: EmployeeGroup
  population: Population
  label: string
}

function row(
  group: EmployeeGroup,
  population: Population,
  label: string = group,
): RaiseRow {
  return { group, population, label }
}

const UA = 'United Academics'
const UA_TENURE = row(UA, 'tenure-related', `${UA}, tenure-related`)
const UA_INSTRUCTIONAL = row(
  UA,
  'career-instructional',
  `${UA}, career instructional`,
)
const UA_RESEARCH = row(UA, 'career-research', `${UA}, career research`)
const UA_PRO_TEM = row(UA, 'pro-tem', `${UA}, pro tem, visiting, and retired`)
const SEIU = row('SEIU 503', 'all')
const TEAMSTERS = row('Teamsters 206', 'all')
const UOPA_OFFICERS = row('UOPA', 'police-officers', 'UOPA, police officers')
const UOPA_DISPATCHERS = row('UOPA', 'dispatchers', 'UOPA, dispatchers')
const UOPA_CSOS = row(
  'UOPA',
  'community-service-officers',
  'UOPA, community service officers',
)
const OA = row('Officers of Administration', 'all')

export const RAISE_ROWS = [
  UA_TENURE,
  UA_INSTRUCTIONAL,
  UA_RESEARCH,
  UA_PRO_TEM,
  SEIU,
  TEAMSTERS,
  UOPA_OFFICERS,
  UOPA_DISPATCHERS,
  UOPA_CSOS,
  OA,
]

/** Position class numbers of the UOPA unit: sworn police officers, campus dispatchers, community service officers. */
const UOPA_CLASS_ROWS: Record<string, RaiseRow> = {
  '5901': UOPA_OFFICERS,
  '0312': UOPA_DISPATCHERS,
  '5523': UOPA_CSOS,
}
/** UOPA was recognized in 2017; before it these classes were in SEIU 503. */
const UOPA_FIRST_CENSUS = 2017
const TEAMSTERS_CLASS_PREFIX = 'J'
const NO_RANK = 'No Rank'
const OA_GRADE = /^OA\d{2}$/
const COACH_GRADE = /^CCH\d$/
const POSTDOC_RANK = /^Postdoctoral/
const PRO_TEM_TITLE = /pro tem|visiting|retired|emerit/i
const TENURE_STATUSES = new Set(['Indefinite Tenure', 'Tenure Track'])

function classifiedRow(
  { positionClass }: FallClassified,
  censusYear: number,
): RaiseRow {
  if (positionClass?.code.startsWith(TEAMSTERS_CLASS_PREFIX)) return TEAMSTERS
  const uopa = UOPA_CLASS_ROWS[positionClass?.code.slice(1) ?? '']
  return uopa && censusYear >= UOPA_FIRST_CENSUS ? uopa : SEIU
}

function unclassifiedRow(record: FallUnclassified): RaiseRow | null {
  const { rank, oaSalaryGrade, academicTitle, apptStatus } = record
  if (COACH_GRADE.test(oaSalaryGrade ?? '')) return null
  if (rank === null || rank === NO_RANK) {
    return OA_GRADE.test(oaSalaryGrade ?? '') ? OA : null
  }
  if (POSTDOC_RANK.test(rank)) return null
  if (PRO_TEM_TITLE.test(academicTitle)) return UA_PRO_TEM
  if (TENURE_STATUSES.has(apptStatus ?? '')) return UA_TENURE
  return rank.includes('Research') ? UA_RESEARCH : UA_INSTRUCTIONAL
}

/** How `raiseRowOf` places a job, for the page's method text. */
export const RAISE_ROW_METHOD =
  "Each continuing job's raise group is this site's estimate from the earlier job's published class, rank, OA salary grade, and title, since UO publishes no bargaining unit: position class J is Teamsters 206; police officer, campus dispatcher, and community service officer classes are UOPA from Fall 2017; other classified jobs are SEIU 503; ranked unclassified jobs are United Academics, split by a pro tem, visiting, retired, or emeritus title, then tenure status, then a research rank; unranked jobs with an OA grade are officers of administration. Supervisors, law, and EC CARES faculty, whom the United Academics unit excludes, cannot be told apart and are counted in it."

/** The jobs `raiseRowOf` places in no row. */
export const UNPLACED_JOBS =
  'executives, coaches, postdoctoral scholars, police sergeants, and unclassified jobs with neither a rank nor an OA salary grade'

/** The raise row a job is estimated to be in, from its class, rank, grade, and title; `null` for temporaries, executives, coaches, postdoctoral scholars, and jobs with no rank or OA grade. */
export function raiseRowOf(
  record: FallRecord,
  censusYear: number,
  group: TrendGroup,
): RaiseRow | null {
  if (isClassifiedTemp(record) || group === 'Executives') return null
  return record.kind === 'classified'
    ? classifiedRow(record, censusYear)
    : unclassifiedRow(record)
}
