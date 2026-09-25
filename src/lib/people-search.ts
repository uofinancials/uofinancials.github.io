import { z } from 'zod'
import { salariesSearchSchema } from './salaries-search.ts'

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

export const SORT_DIRECTIONS = ['asc', 'desc'] as const
export type SortDirection = (typeof SORT_DIRECTIONS)[number]

export const PEOPLE_CHARTS = ['rates', 'groups'] as const
export type PeopleChart = (typeof PEOPLE_CHARTS)[number]

const text = z.string().min(1).optional().catch(undefined)
const wholeDollars = z.number().int().nonnegative().optional().catch(undefined)

/** The people list's URL search params: the salaries filters, plus name, title, category, rate range, sort, page, and chart; `name` is only read to redirect an old person link. */
export const peopleSearchSchema = salariesSearchSchema.extend({
  q: text,
  title: text,
  category: text,
  min: wholeDollars,
  max: wholeDollars,
  sort: z.enum(PEOPLE_SORTS).optional().catch(undefined),
  dir: z.enum(SORT_DIRECTIONS).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
  chart: z.enum(PEOPLE_CHARTS).optional().catch(undefined),
  name: text,
})

export type PeopleSearch = z.infer<typeof peopleSearchSchema>

/** The person page's URL search params: its census year. */
export const personSearchSchema = z.object({
  year: z.number().int().optional().catch(undefined),
})
