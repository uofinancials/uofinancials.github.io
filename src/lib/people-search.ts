import { z } from 'zod'

/** The people page's URL search params: the search text, the chosen name, and its census year. */
export const peopleSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  name: z.string().optional().catch(undefined),
  year: z.number().int().optional().catch(undefined),
})
