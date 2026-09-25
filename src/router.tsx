import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router'
import { PageError } from '@/components/page-error'
import { PageLoading } from '@/components/page-loading'
import { SiteLayout } from '@/components/site-layout'
import {
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  raiseTermsQuery,
} from '@/data/queries'
import { selectOverviewSources } from '@/lib/overview'
import { NotFoundPage } from '@/pages/not-found-page'
import { OverviewPage } from '@/pages/overview-page'
import { SourcesPage } from '@/pages/sources-page'

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: SiteLayout,
  notFoundComponent: NotFoundPage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: async ({ context: { queryClient } }) => {
    const { census, fiscalYear } = selectOverviewSources(
      await queryClient.ensureQueryData(manifestQuery),
    )
    await Promise.all([
      queryClient.ensureQueryData(fallYearQuery(census.year)),
      queryClient.ensureQueryData(budgetYearQuery(fiscalYear)),
    ])
    return { year: census.year, fiscalYear }
  },
  component: OverviewPage,
})

const sourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sources',
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(manifestQuery),
      queryClient.ensureQueryData(raiseTermsQuery),
    ]),
  component: SourcesPage,
})

const routeTree = rootRoute.addChildren([homeRoute, sourcesRoute])

export function createAppRouter(options: {
  queryClient: QueryClient
  history?: RouterHistory
}) {
  return createRouter({
    routeTree,
    context: { queryClient: options.queryClient },
    history: options.history,
    defaultPendingComponent: PageLoading,
    defaultErrorComponent: PageError,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
