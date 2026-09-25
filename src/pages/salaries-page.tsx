import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { SalariesControls } from '@/components/salaries-controls'
import { SalaryDistributionFigure } from '@/components/salary-distribution-figure'
import { SourceCitation } from '@/components/source-citation'
import { useCensusPlace } from '@/components/use-census-place'
import { formatCount } from '@/lib/format'
import { resolveSalariesView, type SalariesSearch } from '@/lib/salaries-search'
import {
  buildDistribution,
  filterJobs,
  RATE_NOTE,
} from '@/lib/salary-distribution'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

const COMPUTED = `each job is counted once in the $10,000 range its published rate falls in, with lower bounds included, in its group as on the Trends page. Percentiles are over primary jobs, temporaries left out, interpolated between ranks. Figures covering fewer than ${MIN_JOBS_SHOWN} jobs are not shown.`

function useSalaries() {
  const { years, year, fiscalYear } = useLoaderData({ from: '/salaries' })
  const search = useSearch({ from: '/salaries' })
  const view = useMemo(
    () => resolveSalariesView(search, years),
    [search, years],
  )
  const { areas, place, placed, positionName } = useCensusPlace({
    year,
    fiscalYear,
    dept: view.dept,
    position: view.position,
  })
  const jobs = useMemo(
    () => filterJobs(placed, view, view.year),
    [placed, view],
  )
  const distribution = useMemo(
    () => buildDistribution(jobs, view.year),
    [jobs, view.year],
  )
  return { search, years, view, areas, place, positionName, jobs, distribution }
}

export function SalariesPage() {
  const navigate = useNavigate({ from: '/salaries' })
  const {
    search,
    years,
    view,
    areas,
    place,
    positionName,
    jobs,
    distribution,
  } = useSalaries()
  const title = `Salary rates, Fall ${view.year}`
  const handleChange = (patch: SalariesSearch) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }) })
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{RATE_NOTE}</p>
      <SalariesControls
        view={view}
        years={years}
        areas={areas}
        place={place}
        positionName={positionName}
        onChange={handleChange}
      />
      {place.scope === 'unknown' && (
        <p>
          No jobs for code {place.code} in Fall {view.year}.
        </p>
      )}
      {jobs.length < MIN_JOBS_SHOWN ? (
        <p>
          {formatCount(jobs.length)} jobs match. The distribution is shown for{' '}
          {MIN_JOBS_SHOWN} or more.
        </p>
      ) : (
        <SalaryDistributionFigure
          distribution={distribution}
          label={`${title}: jobs by salary rate`}
        />
      )}
      <p className="text-sm">
        <Link className="underline" to="/people" search={search}>
          The jobs by name, Fall {view.year}
        </Link>
      </p>
      <SourceCitation
        source={{ kind: 'fall', year: view.year }}
        computed={COMPUTED}
      />
    </div>
  )
}
