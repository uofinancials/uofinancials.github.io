import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { testQueryClient } from '@/test/query-client'
import { App } from './app'
import { createAppRouter } from './router'

function renderAt(path: string) {
  const queryClient = testQueryClient()
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(<App queryClient={queryClient} router={router} />)
}

test('an unknown path renders the not-found page inside the layout', async () => {
  renderAt('/no-such-page')
  expect(
    await screen.findByRole('heading', { name: 'Page not found' }),
  ).toBeInTheDocument()
  const footer = screen.getByRole('contentinfo')
  expect(footer).toHaveTextContent('not affiliated with')
  const repo = 'https://github.com/uofinancials/uofinancials.github.io'
  expect(within(footer).getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    repo,
  )
  expect(
    within(footer).getByRole('link', { name: 'MIT licensed' }),
  ).toHaveAttribute('href', `${repo}/blob/main/LICENSE`)
  expect(within(footer).getByRole('link', { name: 'CC0' })).toHaveAttribute(
    'href',
    `${repo}/blob/main/public/data/LICENSE`,
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
