import { z } from 'zod'
import { censusSearchSchema } from './census-search.ts'
import { SORT_DIRECTIONS } from './sort.ts'

export const PEOPLE_SORTS = [
  'name',
  'dept',
  'appt',
  'rate',
  'title',
  'position',
  'group',
  'category',
] as const
export type PeopleSort = (typeof PEOPLE_SORTS)[number]

export const SORT_LABELS: Record<PeopleSort, string> = {
  name: 'Name',
  dept: 'Pay department',
  appt: 'Appointment',
  rate: 'Annual salary rate',
  title: 'Title',
  position: 'Class or rank',
  group: 'Group',
  category: 'EEO category',
}

/** The people list's optional columns, in table order; the name is always shown. */
export const LIST_COLUMNS = [
  'title',
  'position',
  'dept',
  'rate',
  'appt',
  'term',
  'type',
  'category',
] as const
export type ListColumn = (typeof LIST_COLUMNS)[number]

export const DEFAULT_COLUMNS: readonly ListColumn[] = [
  'title',
  'dept',
  'rate',
  'appt',
]

export const PEOPLE_CHARTS = ['rates', 'groups'] as const
export type PeopleChart = (typeof PEOPLE_CHARTS)[number]

const text = z.string().min(1).optional().catch(undefined)
const wholeDollars = z.number().int().nonnegative().optional().catch(undefined)

/** The people list's URL search params: the census job filters, plus name, title, category, rate range, sort, page, chart, and shown columns; `name` is only read to redirect an old person link. */
export const peopleSearchSchema = censusSearchSchema.extend({
  q: text,
  title: text,
  category: text,
  min: wholeDollars,
  max: wholeDollars,
  sort: z.enum(PEOPLE_SORTS).optional().catch(undefined),
  dir: z.enum(SORT_DIRECTIONS).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
  chart: z.enum(PEOPLE_CHARTS).optional().catch(undefined),
  cols: z.array(z.enum(LIST_COLUMNS)).optional().catch(undefined),
  name: text,
})

export type PeopleSearch = z.infer<typeof peopleSearchSchema>

/** The person page's URL search params: its census year. */
export const personSearchSchema = z.object({
  year: z.number().int().optional().catch(undefined),
})
