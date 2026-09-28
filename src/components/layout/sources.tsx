import { CitedSourceText } from '@/components/layout/cited-source-text'
import { SourceCitation } from '@/components/layout/source-citation'
import {
  type SectionSource,
  sectionSourceKey,
  sourcesSummary,
} from '@/lib/shared/citation'

/** A section's sources and methods, closed under a summary that says whether any figure is computed. */
export function Sources({ sources }: { sources: SectionSource[] }) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="w-fit cursor-pointer text-sm hover:text-foreground">
        {sourcesSummary(sources)}
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((source) => (
          <li key={sectionSourceKey(source)}>
            {source.kind === 'data' ? (
              <SourceCitation source={source.ref} computed={source.computed} />
            ) : (
              <CitedSourceText source={source.source} />
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
