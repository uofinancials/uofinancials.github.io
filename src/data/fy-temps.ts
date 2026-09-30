import { z } from 'zod'

const year = z.number().int()
const count = z.number().int().nonnegative()

/** Classified temporaries' FY pay in one unit, with the FTE the site estimates from it. */
const fyTempsUnitSchema = z.strictObject({
  /** The unit code the FY department name resolves and folds to; may be an area's own code. */
  code: z.string(),
  /** The college or VP area the site places the unit in, as for a Fall job. */
  area: z.string().nullable(),
  jobs: count,
  payCents: z.number().int(),
  /** Pay ÷ the average annual rate of the unit's Fall temporaries, or its area's, or UO's. */
  fteHundredths: count,
})

/** Classified temporaries' actual pay by fiscal year and unit, derived by `pnpm scrape summary` from the FY total pay reports. */
export const fyTempsSchema = z.strictObject({
  years: z.array(
    z.strictObject({
      /** The year the fiscal year ends in. */
      fiscalYear: year,
      /** The Fall census inside the fiscal year. */
      censusYear: year,
      units: z.array(fyTempsUnitSchema),
    }),
  ),
})

export type FyTemps = z.infer<typeof fyTempsSchema>
export type FyTempsUnit = z.infer<typeof fyTempsUnitSchema>
