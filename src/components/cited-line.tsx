import { CitedSourceText } from '@/components/cited-source-text'
import type { CitedSource } from '@/data/cited-source'

/** A source line; the location is left out where each item gives its own page. */
export function CitedLine({
  source,
}: {
  source: Omit<CitedSource, 'location'> & { location?: string }
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Source: <CitedSourceText source={source} />.
    </p>
  )
}
