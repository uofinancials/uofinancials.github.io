import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Manifest } from '@/data/manifest'
import { manifestQuery } from '@/data/queries'
import { fallFile } from '@/test/fall-records'
import { SourceCitation } from './source-citation'

const MANIFEST: Manifest = {
  fall: [
    {
      year: 2025,
      censusDate: '2025-11-01',
      sourcePage: 'https://example.org/salary-reports',
      files: [fallFile()],
    },
  ],
  budget: [],
  rates: null,
}

async function renderCitation(computed?: string) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(manifestQuery.queryKey, MANIFEST)
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <SourceCitation
          source={{ kind: 'fall', year: 2025 }}
          computed={computed}
        />
      ),
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return screen.findByRole('link', { name: 'Fall 2025 Census salary reports' })
}

test('names the dataset, links to it, and links the retrieval date to its source entry', async () => {
  const dataset = await renderCitation()
  expect(dataset).toHaveAttribute('href', 'https://example.org/salary-reports')
  expect(
    screen.getByRole('link', { name: 'retrieved 2026-09-24' }),
  ).toHaveAttribute('href', '/sources#fall-2025')
  expect(screen.queryByText(/Computed:/)).not.toBeInTheDocument()
})

test('labels a computed figure with how it was computed', async () => {
  await renderCitation('sum of salary rate x FTE.')
  expect(
    screen.getByText(/Computed: sum of salary rate x FTE\./),
  ).toBeInTheDocument()
})
