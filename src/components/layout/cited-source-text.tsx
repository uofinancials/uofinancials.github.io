import type { CitedSource } from '@/data/cited-source'

/** A source inline: the linked document, the location when given, and the retrieval date. */
export function CitedSourceText({
  source: { url, document, location, retrievedOn },
}: {
  source: Omit<CitedSource, 'location'> & { location?: string }
}) {
  return (
    <>
      <a className="underline" href={url}>
        {document}
      </a>
      {location && `, ${location}`}, retrieved {retrievedOn}
    </>
  )
}
