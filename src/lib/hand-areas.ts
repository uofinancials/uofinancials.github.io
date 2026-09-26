/** A pay code neither its census's budget hierarchy nor a department-name prefix places, for the Fall censuses `from` to `to`. */
export type HandArea = { code: string; area: string; from: number; to: number }

const ADMINISTRATIVE_SERVICES = '410211'
const ARTS_AND_SCIENCES = '222000'
const DESIGN = '221000'
const EDUCATION = '226000'
const FASS = '410210'
const HEALTH_SERVICES = '490000'
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
  { code: '410201', area: FASS, from: 2019, to: 2022 },
  { code: '410201', area: ADMINISTRATIVE_SERVICES, from: 2023, to: 2025 },
  // 410211 Administrative Services
  { code: '410212', area: ADMINISTRATIVE_SERVICES, from: 2023, to: 2025 },
  // 410231 Adv_Comms Business hub Operations
  { code: '410230', area: ADMINISTRATIVE_SERVICES, from: 2024, to: 2024 },
  // PAST units 129105-129150
  { code: '129100', area: ADMINISTRATIVE_SERVICES, from: 2024, to: 2024 },
  // 267501 Counseling Center Ops
  { code: '267500', area: HEALTH_SERVICES, from: 2019, to: 2025 },
  // 266601 Mus of Nat & Cult Hist
  { code: '266300', area: PROVOST, from: 2019, to: 2025 },
  { code: '266600', area: PROVOST, from: 2019, to: 2025 },
  // 106310 US Office of Governmnt & Comm Relat
  { code: '106003', area: PRESIDENT, from: 2025, to: 2025 },
  // CASDAS: CAS administrative services
  { code: '223991', area: ARTS_AND_SCIENCES, from: 2025, to: 2025 },
  { code: '223995', area: ARTS_AND_SCIENCES, from: 2025, to: 2025 },
  { code: '223997', area: ARTS_AND_SCIENCES, from: 2025, to: 2025 },
  // 222660 CAS NW Indian Lang Inst, from FY24
  { code: '632110', area: ARTS_AND_SCIENCES, from: 2023, to: 2025 },
  // 632400 Rsch Ctr Brain Injry RschTrng CBIRT
  { code: '223529', area: RESEARCH, from: 2019, to: 2022 },
  // 2211xx units are all College of Design
  { code: '221130', area: DESIGN, from: 2019, to: 2019 },
  // 226535 Ed EC Cares
  { code: '226541', area: EDUCATION, from: 2019, to: 2023 },
  // 2269xx units are all Education
  { code: '226920', area: EDUCATION, from: 2019, to: 2021 },
  // 228920 Wayne Morse Center Ops, from FY23
  { code: '210155', area: LAW, from: 2022, to: 2025 },
  // 228840 Law CRES
  { code: '228841', area: LAW, from: 2019, to: 2025 },
  // name only
  { code: '611116', area: RESEARCH, from: 2019, to: 2025 },
  { code: '100000', area: PROVOST, from: 2024, to: 2025 },
  // 110402-110662 in the budget are all Knight Campus units
  { code: '110431', area: KNIGHT_CAMPUS, from: 2024, to: 2025 },
  { code: '110453', area: KNIGHT_CAMPUS, from: 2024, to: 2025 },
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
