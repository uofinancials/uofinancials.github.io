import { z } from 'zod'

/** A hand-entered figure's source: the document, where in it, and when it was retrieved. */
export const citedSourceSchema = z.strictObject({
  url: z.url(),
  document: z.string().min(1),
  location: z.string().min(1),
  retrievedOn: z.iso.date(),
})

export type CitedSource = z.infer<typeof citedSourceSchema>

/** A cited document, its location left out where each item gives its own. */
export type DocumentSource = Omit<CitedSource, 'location'> & {
  location?: string
}

/** One key per cited place: the document's URL and the location in it. */
export function sourceKey(
  source: Pick<DocumentSource, 'url' | 'location'>,
): string {
  return `${source.url} ${source.location ?? ''}`
}
