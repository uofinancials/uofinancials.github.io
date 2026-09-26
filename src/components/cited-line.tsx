import type { CitedSource } from '@/data/cited-source'

/** A source line; the location is left out where each item gives its own page. */
export function CitedLine({
  source: { url, document, location, retrievedOn },
}: {
  source: Omit<CitedSource, 'location'> & { location?: string }
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Source:{' '}
      <a className="underline" href={url}>
        {document}
      </a>
      {location && `, ${location}`}, retrieved {retrievedOn}.
    </p>
  )
}
