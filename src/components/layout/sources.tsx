import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CitedSourceText } from '@/components/layout/cited-source-text'
import { SUMMARY_CLASS } from '@/components/layout/disclosure-class'
import { manifestQuery } from '@/data/queries'
import {
  citeSource,
  type SectionSource,
  type SourceRef,
  sectionSourceKey,
  sourcesSummary,
} from '@/lib/shared/citation'

function DatasetCitation({
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

/** A section's sources and methods, closed under a summary that says whether any figure is computed. */
export function Sources({
  sources,
  methods = [],
}: {
  sources: SectionSource[]
  methods?: string[]
}) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className={SUMMARY_CLASS}>
        {sourcesSummary(sources, methods.length > 0)}
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((source) => (
          <li key={sectionSourceKey(source)}>
            {source.kind === 'document' ? (
              <CitedSourceText source={source.source} />
            ) : (
              <DatasetCitation source={source} computed={source.computed} />
            )}
          </li>
        ))}
        {methods.map((method) => (
          <li key={method}>Method: {method}</li>
        ))}
      </ul>
    </details>
  )
}
