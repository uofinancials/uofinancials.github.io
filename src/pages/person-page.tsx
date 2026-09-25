import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useCanGoBack,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import { PersonView } from '@/components/person-view'
import { peopleIndexQuery } from '@/data/queries'
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
  const { data } = useSuspenseQuery(peopleIndexQuery(useQueryClient()))
  const person = data.people.find((entry) => entry.name === name)
  return (
    <div className="space-y-6">
      <meta name="robots" content="noindex" />
      <BackButton />
      {person ? (
        <PersonView
          person={person}
          medians={data.medians}
          year={resolveCensusYear(year, yearsOf(person))}
        />
      ) : (
        <p>No Fall record is published under the name {name}.</p>
      )}
    </div>
  )
}
