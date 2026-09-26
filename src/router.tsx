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
import type { Manifest } from '@/data/manifest'
import {
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  opeRatesQuery,
  outlookQuery,
  raiseTermsQuery,
} from '@/data/queries'
import { resolveCensusYear } from '@/lib/census-search'
import {
  departmentSearchSchema,
  departmentsSearchSchema,
} from '@/lib/department-search'
import { selectTableSources } from '@/lib/department-table'
import { homeSearchSchema } from '@/lib/home'
import {
  fiscalYearForCensus,
  fiscalYearOf,
  selectOverviewSources,
} from '@/lib/overview'
import { peopleSearchSchema, personSearchSchema } from '@/lib/people-search'
import { eliminationFiscalYear } from '@/lib/scenario-eliminate'
import { firstSavingsYear } from '@/lib/scenario-outlook'
import { scenarioSearchSchema } from '@/lib/scenario-search'
import { trendsSearchSchema } from '@/lib/trends-search'
import { BudgetPage } from '@/pages/budget-page'
import { DepartmentPage } from '@/pages/department-page'
import { DepartmentsPage } from '@/pages/departments-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { OverviewPage } from '@/pages/overview-page'
import { PeoplePage } from '@/pages/people-page'
import { PersonPage } from '@/pages/person-page'
import { ScenariosPage } from '@/pages/scenarios-page'
import { SourcesPage } from '@/pages/sources-page'
import { TrendsPage } from '@/pages/trends-page'

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: SiteLayout,
  notFoundComponent: NotFoundPage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: homeSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    const loadCensus = async () => {
      const sources = selectOverviewSources(
        await queryClient.ensureQueryData(manifestQuery),
      )
      await Promise.all([
        queryClient.ensureQueryData(fallYearQuery(sources.census.year)),
        queryClient.ensureQueryData(budgetYearQuery(sources.fiscalYear)),
      ])
      return sources
    }
    const [{ census, fiscalYear }] = await Promise.all([
      loadCensus(),
      queryClient.ensureQueryData(outlookQuery),
      queryClient.ensureQueryData(opeRatesQuery),
    ])
    return { year: census.year, fiscalYear, censusDate: census.censusDate }
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
  loader: async (options) => {
    const [loaded] = await Promise.all([
      loadFallYears(options),
      options.context.queryClient.ensureQueryData(raiseTermsQuery),
    ])
    return loaded
  },
  component: TrendsPage,
})

const departmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments',
  validateSearch: departmentsSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    const sources = selectTableSources(
      await queryClient.ensureQueryData(manifestQuery),
    )
    await Promise.all(
      [sources.now, sources.before].flatMap(({ year, fiscalYear }) => [
        queryClient.ensureQueryData(fallYearQuery(year)),
        queryClient.ensureQueryData(budgetYearQuery(fiscalYear)),
      ]),
    )
    return sources
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
    const [eliminationFiscalYear] = await Promise.all([
      loadEliminationYear(queryClient, manifest),
      ...fiscalYears.map((year) =>
        queryClient.ensureQueryData(budgetYearQuery(year)),
      ),
      ...fallYears.map((year) =>
        queryClient.ensureQueryData(fallYearQuery(year)),
      ),
    ])
    return { fiscalYears, fallYears, eliminationFiscalYear }
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

const budgetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/budget',
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(outlookQuery),
  component: BudgetPage,
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
  component: ScenariosPage,
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
  component: SourcesPage,
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  trendsRoute,
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
