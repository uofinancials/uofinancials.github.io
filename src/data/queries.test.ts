import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { budgetYearQuery, manifestQuery } from './queries'

const EMPTY_MANIFEST = { fall: [], budget: [], rates: null }

function serve(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function testClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('a data file is fetched from the base path and parsed', async () => {
  const fetchMock = serve(200, EMPTY_MANIFEST)
  await expect(testClient().fetchQuery(manifestQuery)).resolves.toEqual(
    EMPTY_MANIFEST,
  )
  expect(fetchMock).toHaveBeenCalledWith('/data/manifest.json')
})

test('a budget year is fetched by its two-digit file name', async () => {
  serve(404, {})
  await expect(testClient().fetchQuery(budgetYearQuery(2027))).rejects.toThrow(
    'Could not load /data/budget/FY27.json: HTTP 404',
  )
})

test('a file that does not match its schema fails with its path', async () => {
  serve(200, { ...EMPTY_MANIFEST, rates: 'none' })
  await expect(testClient().fetchQuery(manifestQuery)).rejects.toThrow(
    '/data/manifest.json does not match its schema',
  )
})
