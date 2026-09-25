import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router'
import { PageError } from '@/components/page-error'
import { PageLoading } from '@/components/page-loading'
import { peopleIndexQuery } from '@/components/people-index-query'
import { SiteLayout } from '@/components/site-layout'
import { orgCode } from '@/data/budget'
import {
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  raiseTermsQuery,
} from '@/data/queries'
import { resolveCensusYear } from '@/lib/census-search'
import {
  departmentSearchSchema,
  departmentsSearchSchema,
} from '@/lib/department-search'
import { fiscalYearForCensus, selectOverviewSources } from '@/lib/overview'
import { payChangesSearchSchema } from '@/lib/pay-changes-search'
import { peopleSearchSchema, personSearchSchema } from '@/lib/people-search'
import { trendsSearchSchema } from '@/lib/trends-search'
import { DepartmentPage } from '@/pages/department-page'
import { DepartmentsPage } from '@/pages/departments-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { OverviewPage } from '@/pages/overview-page'
import { PayChangesPage } from '@/pages/pay-changes-page'
import { PeoplePage } from '@/pages/people-page'
import { PersonPage } from '@/pages/person-page'
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

async function loadFallYears({
  context: { queryClient },
}: {
  context: { queryClient: QueryClient }
}) {
  const manifest = await queryClient.ensureQueryData(manifestQuery)
  const years = manifest.fall.map(({ year }) => year).sort((a, b) => a - b)
  await Promise.all(
    years.map((year) => queryClient.ensureQueryData(fallYearQuery(year))),
  )
  return { years }
}

const trendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trends',
  validateSearch: trendsSearchSchema,
  loader: loadFallYears,
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

/** The census a search asks for, or the latest, with the budget year that names its areas. */
async function loadCensus({
  context: { queryClient },
  deps,
}: {
  context: { queryClient: QueryClient }
  deps: { year: number | undefined }
}) {
  const manifest = await queryClient.ensureQueryData(manifestQuery)
  const years = manifest.fall.map(({ year }) => year).sort((a, b) => a - b)
  const year = resolveCensusYear(deps.year, years)
  const census = manifest.fall.find((entry) => entry.year === year)
  if (!census) throw notFound()
  const fiscalYear = fiscalYearForCensus(manifest, census.censusDate)
  await Promise.all([
    queryClient.ensureQueryData(fallYearQuery(year)),
    queryClient.ensureQueryData(budgetYearQuery(fiscalYear)),
  ])
  return { years, year, fiscalYear }
}

const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/people',
  validateSearch: peopleSearchSchema,
  beforeLoad: ({ search: { name, year } }) => {
    if (name !== undefined) {
      throw redirect({
        to: '/people/$name',
        params: { name },
        search: { year },
        replace: true,
      })
    }
  },
  loaderDeps: ({ search }) => ({ year: search.year }),
  loader: loadCensus,
  component: PeoplePage,
})

const personRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/people/$name',
  validateSearch: personSearchSchema,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(peopleIndexQuery),
  component: PersonPage,
})

const payChangesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pay-changes',
  validateSearch: payChangesSearchSchema,
  loader: loadFallYears,
  component: PayChangesPage,
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
  peopleRoute,
  personRoute,
  payChangesRoute,
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
