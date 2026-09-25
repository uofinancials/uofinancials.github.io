import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  type RouterHistory,
} from '@tanstack/react-router'
import { PageError } from '@/components/page-error'
import { PageLoading } from '@/components/page-loading'
import { SiteLayout } from '@/components/site-layout'
import { orgCode } from '@/data/budget'
import {
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  raiseTermsQuery,
} from '@/data/queries'
import {
  departmentSearchSchema,
  departmentsSearchSchema,
} from '@/lib/department-search'
import { fiscalYearForCensus, selectOverviewSources } from '@/lib/overview'
import {
  resolveSalariesView,
  salariesSearchSchema,
} from '@/lib/salaries-search'
import { trendsSearchSchema } from '@/lib/trends-search'
import { DepartmentPage } from '@/pages/department-page'
import { DepartmentsPage } from '@/pages/departments-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { OverviewPage } from '@/pages/overview-page'
import { SalariesPage } from '@/pages/salaries-page'
import { SourcesPage } from '@/pages/sources-page'
import { TrendsPage } from '@/pages/trends-page'

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

const trendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trends',
  validateSearch: trendsSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    const manifest = await queryClient.ensureQueryData(manifestQuery)
    const years = manifest.fall.map(({ year }) => year).sort((a, b) => a - b)
    await Promise.all(
      years.map((year) => queryClient.ensureQueryData(fallYearQuery(year))),
    )
    return { years }
  },
  component: TrendsPage,
})

const departmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments',
  validateSearch: departmentsSearchSchema,
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
  component: DepartmentsPage,
})

const departmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments/$code',
  validateSearch: departmentSearchSchema,
  loader: async ({ context: { queryClient }, params: { code } }) => {
    if (!orgCode.safeParse(code).success) throw notFound()
    const manifest = await queryClient.ensureQueryData(manifestQuery)
    const fiscalYears = manifest.budget.map(({ fiscalYear }) => fiscalYear)
    const fallYears = manifest.fall.map(({ year }) => year)
    await Promise.all([
      ...fiscalYears.map((year) =>
        queryClient.ensureQueryData(budgetYearQuery(year)),
      ),
      ...fallYears.map((year) =>
        queryClient.ensureQueryData(fallYearQuery(year)),
      ),
    ])
    return { fiscalYears, fallYears }
  },
  component: DepartmentPage,
})

const salariesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/salaries',
  validateSearch: salariesSearchSchema,
  loaderDeps: ({ search }) => ({ year: search.year }),
  loader: async ({ context: { queryClient }, deps }) => {
    const manifest = await queryClient.ensureQueryData(manifestQuery)
    const years = manifest.fall.map(({ year }) => year).sort((a, b) => a - b)
    const { year } = resolveSalariesView(deps, years)
    const census = manifest.fall.find((entry) => entry.year === year)
    if (!census) throw notFound()
    const fiscalYear = fiscalYearForCensus(manifest, census.censusDate)
    await Promise.all([
      queryClient.ensureQueryData(fallYearQuery(year)),
      queryClient.ensureQueryData(budgetYearQuery(fiscalYear)),
    ])
    return { years, year, fiscalYear }
  },
  component: SalariesPage,
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

const routeTree = rootRoute.addChildren([
  homeRoute,
  trendsRoute,
  departmentsRoute,
  departmentRoute,
  salariesRoute,
  sourcesRoute,
])

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
