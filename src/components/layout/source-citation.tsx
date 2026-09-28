import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { manifestQuery } from '@/data/queries'
import { citeSource, type SourceRef } from '@/lib/shared/citation'

/** A committed dataset inline: its link, publisher, retrieval date, and how a figure was computed from it. */
export function SourceCitation({
  source,
  computed,
}: {
  source: SourceRef
  computed?: string
}) {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const citation = citeSource(manifest, source)
  return (
    <>
      <a className="link" href={citation.href}>
        {citation.dataset}
      </a>
      , {citation.publisher} -{' '}
      <Link className="link" to="/sources" hash={citation.anchor}>
        retrieved {citation.retrievedOn}
      </Link>
      {computed && (
        <>
          <br />
          Computed: {computed}
        </>
      )}
    </>
  )
}
