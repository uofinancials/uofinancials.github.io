import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { budgetYearSchema } from './budget.ts'
import { fallYearSchema } from './fall.ts'
import { manifestSchema } from './manifest.ts'
import { opeRatesSchema } from './ope.ts'
import { raiseTermsSchema } from './raises.ts'

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
    `budget/FY${String(fiscalYear).slice(2)}.json`,
    budgetYearSchema,
  )
}
