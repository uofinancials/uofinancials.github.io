import { queryOptions } from '@tanstack/react-query'
import { peopleNamesQuery } from '@/data/queries'
import { indexNames } from '@/lib/people/person-lookup'

/** Every name across the Fall censuses, searchable. */
export const peopleIndexQuery = queryOptions({
  queryKey: ['derived', 'people-index'],
  queryFn: async ({ client }) =>
    indexNames(await client.ensureQueryData(peopleNamesQuery)),
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: Number.POSITIVE_INFINITY,
})
