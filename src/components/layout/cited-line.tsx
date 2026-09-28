import { CitedSourceText } from '@/components/layout/cited-source-text'
import type { DocumentSource } from '@/data/cited-source'

/** A source line; the location is left out where each item gives its own page. */
export function CitedLine({ source }: { source: DocumentSource }) {
  return (
    <p className="text-xs text-muted-foreground">
      Source: <CitedSourceText source={source} />.
    </p>
  )
}
