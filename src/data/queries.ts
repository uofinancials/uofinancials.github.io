import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { fiscalYearLabel } from './budget.ts'
import { fyTempsSchema } from './fy-temps.ts'
import { manifestSchema } from './manifest.ts'
import { opeRatesSchema } from './ope.ts'
import { outlookSchema } from './outlook.ts'
import { raiseTermsSchema } from './raises.ts'
import {
  areaTrendsSchema,
  departmentsSchema,
  homeSchema,
  peerMediansSchema,
  peopleNamesSchema,
  trendsSummarySchema,
} from './summary.ts'
import { foldedBudgetYearSchema, foldedFallYearSchema } from './unit-aliases.ts'

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
export const outlookQuery = dataQuery('outlook.json', outlookSchema)
export const homeQuery = dataQuery('home.json', homeSchema)
export const trendsSummaryQuery = dataQuery('trends.json', trendsSummarySchema)
export const departmentsQuery = dataQuery('departments.json', departmentsSchema)
export const peopleNamesQuery = dataQuery(
  'people/names.json',
  peopleNamesSchema,
)
export const peerMediansQuery = dataQuery(
  'people/medians.json',
  peerMediansSchema,
)
export const fyTempsQuery = dataQuery('fy-temps.json', fyTempsSchema)

export function fallYearQuery(year: number) {
  return dataQuery(`fall/${year}.json`, foldedFallYearSchema)
}

/** An area's units' and pay departments' yearly figures. */
export function areaTrendsQuery(area: string) {
  return dataQuery(`trends/${area}.json`, areaTrendsSchema)
}

export function budgetYearQuery(fiscalYear: number) {
  return dataQuery(
    `budget/${fiscalYearLabel(fiscalYear)}.json`,
    foldedBudgetYearSchema,
  )
}

export function toData<T>(results: { data: T }[]): T[] {
  return results.map(({ data }) => data)
}
