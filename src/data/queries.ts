import { type QueryClient, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { peerMedians } from '../lib/peer-median.ts'
import { indexPeople } from '../lib/person-lookup.ts'
import { budgetYearSchema, fiscalYearLabel } from './budget.ts'
import { fallYearSchema } from './fall.ts'
import { manifestSchema } from './manifest.ts'
import { opeRatesSchema } from './ope.ts'
import { raiseTermsSchema } from './raises.ts'

const NETWORK_RETRIES = 2

async function fetchData<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const url = `${import.meta.env.BASE_URL}data/${file}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load ${url}: HTTP ${response.status}`)
  }
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) {
    throw new Error(
      `${url} does not match its schema: ${z.prettifyError(parsed.error)}`,
    )
  }
  return parsed.data
}

function dataQuery<T>(file: string, schema: z.ZodType<T>) {
  return queryOptions({
    queryKey: ['data', file],
    queryFn: () => fetchData(file, schema),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: (failures: number, error: Error) =>
      error instanceof TypeError && failures < NETWORK_RETRIES,
  })
}

export const manifestQuery = dataQuery('manifest.json', manifestSchema)
export const opeRatesQuery = dataQuery('ope.json', opeRatesSchema)
export const raiseTermsQuery = dataQuery('raises.json', raiseTermsSchema)

export function fallYearQuery(year: number) {
  return dataQuery(`fall/${year}.json`, fallYearSchema)
}

export function budgetYearQuery(fiscalYear: number) {
  return dataQuery(
    `budget/${fiscalYearLabel(fiscalYear)}.json`,
    budgetYearSchema,
  )
}

/** Every name across the Fall censuses, and the class and rank medians, built once from the cached Fall files. */
export function peopleIndexQuery(queryClient: QueryClient) {
  return queryOptions({
    queryKey: ['derived', 'people-index'],
    queryFn: async () => {
      const manifest = await queryClient.ensureQueryData(manifestQuery)
      const years = await Promise.all(
        manifest.fall.map(({ year }) =>
          queryClient.ensureQueryData(fallYearQuery(year)),
        ),
      )
      return { people: indexPeople(years), medians: peerMedians(years) }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
}
