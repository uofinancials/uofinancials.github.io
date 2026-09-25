import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { App } from './app'
import { createAppRouter } from './router'

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(<App queryClient={queryClient} router={router} />)
}

test('the home page renders inside the layout with the independence notice', async () => {
  renderAt('/')
  expect(
    await screen.findByRole('heading', { level: 1, name: 'UO Financials' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent(
    'not affiliated with',
  )
  expect(screen.getByRole('link', { name: 'Report it' })).toBeInTheDocument()
})

test('an unknown path renders the not-found page inside the layout', async () => {
  renderAt('/no-such-page')
  expect(
    await screen.findByRole('heading', { name: 'Page not found' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent(
    'not affiliated with',
  )
})

test('a page whose data fails to load says which file and offers a retry', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('', { status: 404 })),
  )
  renderAt('/sources')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not load /data/manifest.json: HTTP 404',
  )
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent(
    'not affiliated with',
  )
})
