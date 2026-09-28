import type { DocumentSource } from '@/data/cited-source'

/** A source inline: the linked document, the location when given, and the retrieval date. */
export function CitedSourceText({
  source: { url, document, location, retrievedOn },
}: {
  source: DocumentSource
}) {
  return (
    <>
      <a className="link" href={url}>
        {document}
      </a>
      {location && `, ${location}`}, retrieved {retrievedOn}
    </>
  )
}
