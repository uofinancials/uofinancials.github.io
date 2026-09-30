/** A pay code as the census publishes it that neither its census's budget hierarchy nor a department-name prefix places, for the Fall censuses `from` to `to`. */
export type HandArea = { code: string; area: string; from: number; to: number }

const ADMINISTRATIVE_SERVICES = '410211'
const DESIGN = '221000'
const FASS = '410210'
const KNIGHT_CAMPUS = '110400'
const LAW = '228000'
const PRESIDENT = '100100'
const PROVOST = '120000'
const RESEARCH = '600000'

/**
 * Each row beside the published unit it is assigned by. A title prefix names
 * the area it labels in that census's hierarchy; without one, a row follows
 * the unit's published successor.
 */
export const HAND_AREAS: readonly HandArea[] = [
  // FASS units 410202-410207, an area to FY23, then in 410211
  { code: '410201', area: FASS, from: 2018, to: 2022 },
  { code: '410201', area: ADMINISTRATIVE_SERVICES, from: 2023, to: 2025 },
  // 410211 Administrative Services
  { code: '410212', area: ADMINISTRATIVE_SERVICES, from: 2023, to: 2025 },
  // 410231 Adv_Comms Business hub Operations
  { code: '410230', area: ADMINISTRATIVE_SERVICES, from: 2024, to: 2024 },
  // PAST units 129105-129150
  { code: '129100', area: ADMINISTRATIVE_SERVICES, from: 2024, to: 2024 },
  // 106310 US Office of Governmnt & Comm Relat
  { code: '106003', area: PRESIDENT, from: 2025, to: 2025 },
  // 632400 Rsch Ctr Brain Injry RschTrng CBIRT
  { code: '223529', area: RESEARCH, from: 2019, to: 2022 },
  // 2211xx units are all College of Design
  { code: '221130', area: DESIGN, from: 2017, to: 2019 },
  // 228920 Wayne Morse Center Ops, from FY23
  { code: '210155', area: LAW, from: 2022, to: 2025 },
  // name only
  { code: '611116', area: RESEARCH, from: 2014, to: 2025 },
  { code: '100000', area: PROVOST, from: 2024, to: 2025 },
  // Pres: every FY21 Pres unit sits in 100100
  { code: '110000', area: PRESIDENT, from: 2015, to: 2015 },
  { code: '211150', area: PRESIDENT, from: 2017, to: 2017 },
  // Prov and Acad Aff: every FY21 Prov unit sits in 120000, and 229300 is Prov
  // in Fall 2014 and Acad Aff in Fall 2015; SOMD Bach units from FY21
  { code: '229300', area: PROVOST, from: 2014, to: 2015 },
  { code: '641601', area: PROVOST, from: 2014, to: 2015 },
  // VPFA: 410207 VPFA FASS Executive
  { code: '410440', area: FASS, from: 2016, to: 2017 },
  // Rsch: every FY21 Rsch unit sits in 600000
  { code: '602100', area: RESEARCH, from: 2015, to: 2016 },
  { code: '611111', area: RESEARCH, from: 2014, to: 2016 },
  { code: '611113', area: RESEARCH, from: 2014, to: 2016 },
  { code: '630500', area: RESEARCH, from: 2014, to: 2015 },
  { code: '630672', area: RESEARCH, from: 2014, to: 2015 },
  { code: '630800', area: RESEARCH, from: 2014, to: 2016 },
  { code: '631710', area: RESEARCH, from: 2014, to: 2016 },
  { code: '632110', area: RESEARCH, from: 2014, to: 2016 },
  { code: '632200', area: RESEARCH, from: 2014, to: 2016 },
  { code: '223529', area: RESEARCH, from: 2014, to: 2016 },
  { code: '660200', area: RESEARCH, from: 2014, to: 2016 },
  // 110402-110662 in the budget are all Knight Campus units
  { code: '110431', area: KNIGHT_CAMPUS, from: 2024, to: 2025 },
  { code: '110502', area: KNIGHT_CAMPUS, from: 2023, to: 2023 },
  { code: '110510', area: KNIGHT_CAMPUS, from: 2024, to: 2025 },
  { code: '110511', area: KNIGHT_CAMPUS, from: 2019, to: 2025 },
  { code: '110512', area: KNIGHT_CAMPUS, from: 2023, to: 2025 },
  { code: '110513', area: KNIGHT_CAMPUS, from: 2022, to: 2025 },
  { code: '110514', area: KNIGHT_CAMPUS, from: 2020, to: 2025 },
  { code: '110515', area: KNIGHT_CAMPUS, from: 2020, to: 2025 },
  { code: '110520', area: KNIGHT_CAMPUS, from: 2023, to: 2023 },
  { code: '110521', area: KNIGHT_CAMPUS, from: 2019, to: 2025 },
  { code: '110522', area: KNIGHT_CAMPUS, from: 2020, to: 2025 },
  { code: '110532', area: KNIGHT_CAMPUS, from: 2024, to: 2025 },
  { code: '110651', area: KNIGHT_CAMPUS, from: 2025, to: 2025 },
]

export function handAreasFor(censusYear: number): HandArea[] {
  return HAND_AREAS.filter(
    ({ from, to }) => from <= censusYear && censusYear <= to,
  )
}
