import { QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Manifest } from '@/data/manifest'
import { manifestQuery } from '@/data/queries'
import type { SectionSource } from '@/lib/shared/citation'
import { fallFile } from '@/test/fall-records'
import { testQueryClient } from '@/test/query-client'
import { Sources } from './sources'

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
  summary: null,
}

const FALL: SectionSource = { kind: 'fall', year: 2025 }

const DOCUMENT: SectionSource = {
  kind: 'document',
  source: {
    url: 'https://example.org/board.pdf',
    document: 'Board materials',
    location: 'p. 4',
    retrievedOn: '2026-09-25',
  },
}

async function renderSources(sources: SectionSource[]) {
  const queryClient = testQueryClient()
  queryClient.setQueryData(manifestQuery.queryKey, MANIFEST)
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <Sources sources={sources} />,
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findByRole('link', { name: 'Fall 2025 Census salary reports' })
  return container.querySelector('details')
}

test('closes the sources under a summary until opened', async () => {
  const details = await renderSources([FALL, DOCUMENT])
  expect(details).not.toHaveAttribute('open')
  fireEvent.click(screen.getByText('Sources (2)'))
  expect(details).toHaveAttribute('open')
})

test('names each dataset and document, links to it, and links a dataset retrieval date to its source entry', async () => {
  await renderSources([FALL, DOCUMENT])
  expect(
    screen.getByRole('link', { name: 'Fall 2025 Census salary reports' }),
  ).toHaveAttribute('href', 'https://example.org/salary-reports')
  expect(
    screen.getByRole('link', { name: 'retrieved 2026-09-24' }),
  ).toHaveAttribute('href', '/sources#fall-2025')
  expect(screen.getByRole('link', { name: 'Board materials' })).toHaveAttribute(
    'href',
    'https://example.org/board.pdf',
  )
  expect(screen.getByText(/p\. 4, retrieved 2026-09-25/)).toBeInTheDocument()
  expect(screen.queryByText(/Computed:/)).not.toBeInTheDocument()
})

test('labels a computed figure in the summary and says how under its source', async () => {
  await renderSources([{ ...FALL, computed: 'sum of salary rate x FTE.' }])
  expect(screen.getByText('Source and method')).toBeInTheDocument()
  expect(
    screen.getByText(/Computed: sum of salary rate x FTE\./),
  ).toBeInTheDocument()
})
