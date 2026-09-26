import { QueryClient } from '@tanstack/react-query'

/** A client that fails a query at once, so a test sees the error without waiting out retries. */
export function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}
