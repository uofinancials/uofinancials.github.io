import { z } from 'zod'

/** The people page's URL search params: the search text and the chosen name. */
export const peopleSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  name: z.string().optional().catch(undefined),
})
