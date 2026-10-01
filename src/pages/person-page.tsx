import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams, useSearch } from '@tanstack/react-router'
import { Sources } from '@/components/layout/sources'
import { BackButton } from '@/components/person/back-button'
import { PersonView } from '@/components/person/view'
import { peerMediansQuery, personBucketQuery } from '@/data/queries'
import { resolveCensusYear } from '@/lib/census/search'
import { nameBucketOf, personIn } from '@/lib/people/name-bucket'
import { yearsOf } from '@/lib/people/person-lookup'

export function PersonPage() {
  const { name } = useParams({ from: '/people/$name' })
  const { year } = useSearch({ from: '/people/$name' })
  const { data: bucket } = useSuspenseQuery(
    personBucketQuery(nameBucketOf(name)),
  )
  const { data: medians } = useSuspenseQuery(peerMediansQuery)
  const person = personIn(bucket, name)
  return (
    <div className="space-y-6">
      <meta name="robots" content="noindex" />
      {person ? (
        <>
          <PersonView
            person={person}
            medians={medians}
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
