import { MIN_JOBS_SHOWN } from './trends.ts'

/** A census pair's label, e.g. `2024-25`. */
export function pairLabel(fromYear: number): string {
  return `${fromYear}-${String(fromYear + 1).slice(-2)}`
}

export const ALL_PAIRS = 'All continuing jobs'

/** What a change in salary rate between two censuses covers. */
export const RATE_NOTE =
  'A change is between the annual salary rates UO publishes for one job in two consecutive Fall censuses. It includes every increase that took effect between the two census dates, so an increase effective before a census counts in the pair ending there. Rates are not pay, and dollars are as published, not adjusted for inflation.'
/** How a continuing job and its change are computed. */
export const CONTINUING_JOB_METHOD = `a continuing job is a person link this site computes: a name, exactly as published, with one primary job in each of two consecutive censuses, both paid by the same pay department, counting codes this site joins to one unit by hand as one. UO publishes no person identifier, so people who change department or name are not linked. Pairs are left out when the job moved between classified and unclassified, or its term changed between 9 and 12 months; appointment changes stay in, since a rate is the full-time rate. The change is the later rate over the earlier, less one, counted in the group, EEO category, pay department, and class or rank of the earlier job; class or rank is as in the person view's median. Medians and distributions are shown for ${MIN_JOBS_SHOWN} or more pairs.`

/** Ranks UO renamed between two censuses, by the later census; a linked job moving from `from` to `to` that year has not changed rank. */
export const RANK_RENAMES = [
  {
    toYear: 2015,
    from: 'Postdoctoral Research Assoc',
    to: 'Postdoctoral Scholar',
  },
  {
    toYear: 2015,
    from: 'Research Assistant',
    to: 'Assistant Professor, Clinical',
  },
  { toYear: 2016, from: 'No Rank', to: 'Professor' },
  { toYear: 2025, from: 'Instructor', to: 'Teaching Assistant Professor' },
  {
    toYear: 2025,
    from: 'Senior Instructor I',
    to: 'Teaching Associate Professor',
  },
  { toYear: 2025, from: 'Senior Instructor II', to: 'Teaching Professor' },
] as const

export function isRankRename(
  from: string,
  to: string,
  toYear: number,
): boolean {
  return RANK_RENAMES.some(
    (rename) =>
      rename.toYear === toYear && rename.from === from && rename.to === to,
  )
}

/** The censuses the renames span: the one before the first rename to the last. */
export const RENAME_RANGE = {
  from: Math.min(...RANK_RENAMES.map(({ toYear }) => toYear)) - 1,
  to: Math.max(...RANK_RENAMES.map(({ toYear }) => toYear)),
}

/** Words in published job titles read as the same word, by the form they are compared as. */
export const TITLE_ABBREVIATIONS: Record<string, string[]> = {
  '1': ['i'],
  '2': ['ii'],
  '3': ['iii'],
  adjunct: ['adj'],
  advisor: ['adviser'],
  assistant: ['asst', 'assist'],
  associate: ['assoc'],
  director: ['dir'],
  instructor: ['instr'],
  laboratory: ['lab'],
  manager: ['mgr'],
  professor: ['prof'],
  program: ['prog'],
  research: ['rsch'],
  senior: ['sr'],
  services: ['svcs'],
  specialist: ['spec'],
}

const CANONICAL_WORD = new Map(
  Object.entries(TITLE_ABBREVIATIONS).flatMap(([word, forms]) =>
    forms.map((form) => [form, word] as const),
  ),
)

/** A title as it is compared: lower case, periods and commas dropped, spaces collapsed, abbreviations spelled out. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter((word) => word !== '')
    .map((word) => CANONICAL_WORD.get(word) ?? word)
    .join(' ')
}
