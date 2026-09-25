import { queryOptions } from '@tanstack/react-query'
import { fallYearQuery, manifestQuery } from '@/data/queries'
import { peerMedians } from '@/lib/peer-median'
import { indexPeople } from '@/lib/person-lookup'

/** Every name across the Fall censuses, and the class and rank medians, built once from the cached Fall files. */
export const peopleIndexQuery = queryOptions({
  queryKey: ['derived', 'people-index'],
  queryFn: async ({ client }) => {
    const manifest = await client.ensureQueryData(manifestQuery)
    const years = await Promise.all(
      manifest.fall.map(({ year }) =>
        client.ensureQueryData(fallYearQuery(year)),
      ),
    )
    return { people: indexPeople(years), medians: peerMedians(years) }
  },
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: Number.POSITIVE_INFINITY,
})
