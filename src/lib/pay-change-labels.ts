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
