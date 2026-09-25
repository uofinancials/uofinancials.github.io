import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { manifestQuery } from '@/data/queries'
import { citeSource, type SourceRef } from '@/lib/citation'

/** The caption under a figure: its source, retrieval date, and how it was computed. */
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
    <p className="text-xs text-muted-foreground">
      Source:{' '}
      <a className="underline" href={citation.href}>
        {citation.dataset}
      </a>
      , {citation.publisher} -{' '}
      <Link className="underline" to="/sources" hash={citation.anchor}>
        retrieved {citation.retrievedOn}
      </Link>
      {computed && (
        <>
          <br />
          Computed: {computed}
        </>
      )}
    </p>
  )
}
