/** A department code the census published for the unit `sameAs` names, joined by hand review. */
export type UnitAlias = { code: string; sameAs: string }

export const UNIT_ALIASES: readonly UnitAlias[] = [
  // HR Unclassified Personnel Services, HR Operations from Fall 2015
  { code: '210900', sameAs: '441010' },
  // CAS grant operations, under their own code in Fall 2023 only
  { code: '223993', sameAs: '223861' },
  // Tykeson advising, under Arts and Sciences from Fall 2023
  { code: '267801', sameAs: '223951' },
  // Affirmative Action office, under the President from Fall 2018
  { code: '444000', sameAs: '101200' },
  // University Advancement, recoded in Fall 2016
  { code: '500000', sameAs: '500100' },
  // Jordan Schnitzer Museum of Art, recoded in Fall 2016
  { code: '530000', sameAs: '531111' },
  // Research core business services, recoded in Fall 2015
  { code: '611114', sameAs: '611116' },
  // Oregon Institute of Marine Biology, under Arts and Sciences from Fall 2024
  { code: '630950', sameAs: '223590' },
  // CBIRT, under Arts and Sciences from Fall 2019
  { code: '632401', sameAs: '223529' },
  // Graduate Internship Program, under Knight Campus from Fall 2019
  { code: '641511', sameAs: '110511' },
]

/** Department code pairs a hand review found to be different units, in code order. */
export const DISTINCT_UNITS: readonly (readonly [string, string])[] = [
  ['110400', '110600'],
  ['110600', '110800'],
  ['129510', '221150'],
  ['223540', '223546'],
  ['226410', '226413'],
  ['263000', '433200'],
  ['264000', '264700'],
  ['410201', '410230'],
  ['632200', '632810'],
]
