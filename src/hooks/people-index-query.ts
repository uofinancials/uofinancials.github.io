import { queryOptions } from '@tanstack/react-query'
import { summaryQuery } from '@/data/queries'
import { indexNames } from '@/lib/people/person-lookup'

/** Every name across the Fall censuses, and the class and rank medians, from the summary. */
export const peopleIndexQuery = queryOptions({
  queryKey: ['derived', 'people-index'],
  queryFn: async ({ client }) => {
    const { people } = await client.ensureQueryData(summaryQuery)
    return {
      people: indexNames(people.names),
      medians: new Map(Object.entries(people.medians)),
    }
  },
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: Number.POSITIVE_INFINITY,
})
