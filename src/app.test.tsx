import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { App } from './app'

test('renders the site title', () => {
  render(<App />)
  expect(screen.getByText('UO Financials')).toBeInTheDocument()
})
