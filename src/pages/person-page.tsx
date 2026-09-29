import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useParams, useSearch } from '@tanstack/react-router'
import { Sources } from '@/components/layout/sources'
import { BackButton } from '@/components/person/back-button'
import { PersonView } from '@/components/person/view'
import { fallYearQuery, toData } from '@/data/queries'
import { peopleIndexQuery } from '@/hooks/people-index-query'
import { resolveCensusYear } from '@/lib/census/search'
import { personOf, yearsOf } from '@/lib/people/person-lookup'

export function PersonPage() {
  const { name } = useParams({ from: '/people/$name' })
  const { year } = useSearch({ from: '/people/$name' })
  const { entry } = useLoaderData({ from: '/people/$name' })
  const { data } = useSuspenseQuery(peopleIndexQuery)
  const falls = useSuspenseQueries({
    queries: (entry?.runs.flat() ?? []).map(fallYearQuery),
    combine: toData,
  })
  const person = entry && personOf(entry, falls)
  return (
    <div className="space-y-6">
      <meta name="robots" content="noindex" />
      {person ? (
        <>
          <PersonView
            person={person}
            medians={data.medians}
            year={resolveCensusYear(year, yearsOf(person))}
          />
          <Sources
            sources={[
              {
                kind: 'fall-range',
                from: Math.min(...yearsOf(person)),
                to: Math.max(...yearsOf(person)),
              },
            ]}
          />
        </>
      ) : (
        <>
          <BackButton />
          <p>No Fall record is published under the name {name}.</p>
        </>
      )}
    </div>
  )
}
