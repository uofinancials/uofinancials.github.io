import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useCanGoBack,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import { peopleIndexQuery } from '@/components/people-index-query'
import { PersonView } from '@/components/person-view'
import { SourceCitation } from '@/components/source-citation'
import { yearsOf } from '@/lib/person-lookup'
import { resolveCensusYear } from '@/lib/salaries-search'

const BACK_CLASS = 'text-sm underline'

function BackButton() {
  const router = useRouter()
  if (!useCanGoBack()) {
    return (
      <Link className={BACK_CLASS} to="/people">
        Back to people
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={BACK_CLASS}
      onClick={() => router.history.back()}
    >
      Back
    </button>
  )
}

export function PersonPage() {
  const { name } = useParams({ from: '/people/$name' })
  const { year } = useSearch({ from: '/people/$name' })
  const { data } = useSuspenseQuery(peopleIndexQuery)
  const person = data.people.find((entry) => entry.name === name)
  return (
    <div className="space-y-6">
      <meta name="robots" content="noindex" />
      <BackButton />
      {person ? (
        <>
          <PersonView
            person={person}
            medians={data.medians}
            year={resolveCensusYear(year, yearsOf(person))}
          />
          <SourceCitation
            source={{
              kind: 'fall-range',
              from: Math.min(...yearsOf(person)),
              to: Math.max(...yearsOf(person)),
            }}
          />
        </>
      ) : (
        <p>No Fall record is published under the name {name}.</p>
      )}
    </div>
  )
}
