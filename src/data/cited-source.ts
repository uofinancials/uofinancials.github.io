import { z } from 'zod'

/** A hand-entered figure's source: the document, where in it, and when it was retrieved. */
export const citedSourceSchema = z.strictObject({
  url: z.url(),
  document: z.string().min(1),
  location: z.string().min(1),
  retrievedOn: z.iso.date(),
})

export type CitedSource = z.infer<typeof citedSourceSchema>

/** One key per cited place: the document's URL and the location in it. */
export function sourceKey(
  source: Pick<CitedSource, 'url' | 'location'>,
): string {
  return `${source.url} ${source.location}`
}
