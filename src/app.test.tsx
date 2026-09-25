import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { App } from './app'
import { createAppRouter } from './router'

function renderAt(path: string) {
  const queryClient = new QueryClient()
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
