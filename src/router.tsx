import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  notFound,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router'
import { PageError } from '@/components/layout/page-error'
import { PageLoading } from '@/components/layout/page-loading'
import { SiteLayout } from '@/components/layout/site-layout'
import { orgCode } from '@/data/budget'
import type { Manifest } from '@/data/manifest'
import {
  areaTrendsQuery,
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  opeRatesQuery,
  outlookQuery,
  raiseTermsQuery,
  summaryQuery,
} from '@/data/queries'
import { peopleIndexQuery } from '@/hooks/people-index-query'
import { resolveCensusYear } from '@/lib/census/search'
import {
  fiscalYearForCensus,
  fiscalYearOf,
  selectOverviewSources,
} from '@/lib/census/totals'
import {
  departmentSearchSchema,
  departmentsSearchSchema,
} from '@/lib/departments/search'
import { homeSearchSchema } from '@/lib/home/home'
import { peopleSearchSchema, personSearchSchema } from '@/lib/people/search'
import { eliminationFiscalYear } from '@/lib/scenario/eliminate'
import { firstSavingsYear } from '@/lib/scenario/outlook'
import { scenarioSearchSchema } from '@/lib/scenario/search'
import {
  payChangesSearchSchema,
  pickReportParams,
  trendsSearchSchema,
} from '@/lib/trends/search'
import { NotFoundPage } from '@/pages/not-found-page'

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: SiteLayout,
  notFoundComponent: NotFoundPage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: homeSearchSchema,
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(manifestQuery),
      queryClient.ensureQueryData(summaryQuery),
      queryClient.ensureQueryData(outlookQuery),
      queryClient.ensureQueryData(raiseTermsQuery),
    ]),
  component: lazyRouteComponent(
    () => import('@/pages/overview-page'),
    'OverviewPage',
  ),
})

async function loadBudgetYears(queryClient: QueryClient) {
  const manifest = await queryClient.ensureQueryData(manifestQuery)
  const fiscalYears = manifest.budget.map(({ fiscalYear }) => fiscalYear)
  await Promise.all(
    fiscalYears.map((year) =>
      queryClient.ensureQueryData(budgetYearQuery(year)),
    ),
  )
  return fiscalYears
}

const trendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trends',
  validateSearch: trendsSearchSchema,
  beforeLoad: ({ search }) => {
    const { metric, ...filters } = search
    if (metric === 'change') {
      throw redirect({
        to: '/trends/pay-changes',
        search: filters,
        replace: true,
      })
    }
    const kept = pickReportParams(search)
    if (Object.keys(search).length > Object.keys(kept).length) {
      throw redirect({ to: '/trends', search: kept, replace: true })
    }
  },
  loaderDeps: ({ search }) => ({ area: search.area }),
  loader: async ({ context: { queryClient }, deps }) => {
    const [manifest, summary] = await Promise.all([
      queryClient.ensureQueryData(manifestQuery),
      queryClient.ensureQueryData(summaryQuery),
    ])
    const area = summary.trends.areas.find(({ code }) => code === deps.area)
    if (area) await queryClient.ensureQueryData(areaTrendsQuery(area.code))
    const fiscalYears = manifest.budget.map(({ fiscalYear }) => fiscalYear)
    return {
      years: manifest.fall.map(({ year }) => year).sort((a, b) => a - b),
      fiscalYears: {
        from: Math.min(...fiscalYears),
        to: Math.max(...fiscalYears),
      },
    }
  },
  component: lazyRouteComponent(
    () => import('@/pages/trends-page'),
    'TrendsPage',
  ),
})

const payChangesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trends/pay-changes',
  validateSearch: payChangesSearchSchema,
  loaderDeps: ({ search }) => ({ area: search.area }),
  loader: async ({ context: { queryClient }, deps }) => {
    const loadYears = async () => {
      const manifest = await queryClient.ensureQueryData(manifestQuery)
      const years = manifest.fall.map(({ year }) => year).sort((a, b) => a - b)
      await Promise.all(
        years.map((year) => queryClient.ensureQueryData(fallYearQuery(year))),
      )
      return years
    }
    const [years, fiscalYears] = await Promise.all([
      loadYears(),
      deps.area === undefined ? [] : loadBudgetYears(queryClient),
      queryClient.ensureQueryData(raiseTermsQuery),
    ])
    return { years, fiscalYears }
  },
  component: lazyRouteComponent(
    () => import('@/pages/pay-changes-page'),
    'PayChangesPage',
  ),
})

const departmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments',
  validateSearch: departmentsSearchSchema,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(summaryQuery),
  component: lazyRouteComponent(
    () => import('@/pages/departments-page'),
    'DepartmentsPage',
  ),
})

const departmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments/$code',
  validateSearch: departmentSearchSchema,
  loader: async ({ context: { queryClient }, params: { code } }) => {
    if (!orgCode.safeParse(code).success) throw notFound()
    const manifest = await queryClient.ensureQueryData(manifestQuery)
    const fallYears = manifest.fall.map(({ year }) => year)
    const [eliminationFiscalYear, fiscalYears] = await Promise.all([
      loadEliminationYear(queryClient, manifest),
      loadBudgetYears(queryClient),
      ...fallYears.map((year) =>
        queryClient.ensureQueryData(fallYearQuery(year)),
      ),
    ])
    return { fiscalYears, fallYears, eliminationFiscalYear }
  },
  component: lazyRouteComponent(
    () => import('@/pages/department-page'),
    'DepartmentPage',
  ),
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
  component: lazyRouteComponent(
    () => import('@/pages/people-page'),
    'PeoplePage',
  ),
})

const personRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/people/$name',
  validateSearch: personSearchSchema,
  loader: async ({ context: { queryClient }, params: { name } }) => {
    const { people } = await queryClient.ensureQueryData(peopleIndexQuery)
    const entry = people.find((person) => person.name === name) ?? null
    await Promise.all(
      (entry?.runs.flat() ?? []).map((year) =>
        queryClient.ensureQueryData(fallYearQuery(year)),
      ),
    )
    return { entry }
  },
  component: lazyRouteComponent(
    () => import('@/pages/person-page'),
    'PersonPage',
  ),
})

const budgetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/budget',
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(outlookQuery),
  component: lazyRouteComponent(
    () => import('@/pages/budget-page'),
    'BudgetPage',
  ),
})

/** The budget year a scenario's eliminations read. */
async function loadEliminationYear(
  queryClient: QueryClient,
  manifest: Manifest,
): Promise<number> {
  const { census } = selectOverviewSources(manifest)
  const [projection] = (await queryClient.ensureQueryData(outlookQuery))
    .projections
  return eliminationFiscalYear(
    manifest.budget.map((entry) => entry.fiscalYear),
    firstSavingsYear(projection.fiscalYears, fiscalYearOf(census.censusDate)),
  )
}

/** The latest census and its budget, the rates, raise terms, and outlook, and the budget eliminations use. */
async function loadScenario({
  context: { queryClient },
}: {
  context: { queryClient: QueryClient }
}) {
  const manifest = await queryClient.ensureQueryData(manifestQuery)
  const { census, fiscalYear } = selectOverviewSources(manifest)
  const loadEliminationBudget = async () => {
    const year = await loadEliminationYear(queryClient, manifest)
    await queryClient.ensureQueryData(budgetYearQuery(year))
    return year
  }
  const [eliminationYear] = await Promise.all([
    loadEliminationBudget(),
    queryClient.ensureQueryData(fallYearQuery(census.year)),
    queryClient.ensureQueryData(budgetYearQuery(fiscalYear)),
    queryClient.ensureQueryData(opeRatesQuery),
    queryClient.ensureQueryData(raiseTermsQuery),
  ])
  return {
    year: census.year,
    fiscalYear,
    censusDate: census.censusDate,
    eliminationFiscalYear: eliminationYear,
  }
}

const scenariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scenarios',
  validateSearch: scenarioSearchSchema,
  loader: loadScenario,
  component: lazyRouteComponent(
    () => import('@/pages/scenarios-page'),
    'ScenariosPage',
  ),
})

const sourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sources',
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(manifestQuery),
      queryClient.ensureQueryData(raiseTermsQuery),
      queryClient.ensureQueryData(outlookQuery),
    ]),
  component: lazyRouteComponent(
    () => import('@/pages/sources-page'),
    'SourcesPage',
  ),
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  trendsRoute,
  payChangesRoute,
  departmentsRoute,
  departmentRoute,
  peopleRoute,
  personRoute,
  budgetRoute,
  scenariosRoute,
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
