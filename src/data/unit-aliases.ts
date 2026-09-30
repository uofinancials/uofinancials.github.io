import { type BudgetYear, budgetYearSchema, orgCodeParam } from './budget.ts'
import { type FallYear, fallYearSchema } from './fall.ts'
import { PAY_CODE_UNITS } from './pay-code-units.ts'

/** A department code the census published for the unit `sameAs` names, joined by hand review; `sameAs` is never itself an alias code. */
export type UnitAlias = { code: string; sameAs: string }

export const UNIT_ALIASES: readonly UnitAlias[] = [
  // HR Unclassified Personnel Services, HR Operations from Fall 2015
  { code: '210900', sameAs: '441010' },
  // CAS grant operations, under their own code in Fall 2023 only
  { code: '223993', sameAs: '223915' },
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
  { code: '641511', sameAs: '110510' },
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

const ALL_ALIASES = [...UNIT_ALIASES, ...PAY_CODE_UNITS]

const SAME_AS = new Map(ALL_ALIASES.map(({ code, sameAs }) => [code, sameAs]))

/** The code the site counts a department under: `code` itself, unless a hand review joined it to a unit, as an old code or as a pay code the budget does not publish. */
export function unitCodeOf(code: string): string {
  return SAME_AS.get(code) ?? code
}

/** The other codes a hand review joined to this one. */
export function aliasCodesOf(code: string): string[] {
  return ALL_ALIASES.filter(({ sameAs }) => sameAs === code).map(
    (alias) => alias.code,
  )
}

type Department = FallYear['records'][number]['payDepartment']

function foldDepartment(department: Department): Department {
  const { code } = department
  if (code === null) return department
  const unit = unitCodeOf(code)
  return unit === code
    ? department
    : { ...department, code: unit, publishedCode: code }
}

/** The census with each alias pay and home department code replaced by its unit's code, the published code kept beside it; the names stay as published. */
export function foldUnitAliases(year: FallYear): FallYear {
  return {
    ...year,
    records: year.records.map((record) => {
      const payDepartment = foldDepartment(record.payDepartment)
      const homeDepartment = foldDepartment(record.homeDepartment)
      return payDepartment === record.payDepartment &&
        homeDepartment === record.homeDepartment
        ? record
        : { ...record, payDepartment, homeDepartment }
    }),
  }
}

/** The budget with each alias org's lines under its unit's code, and the alias org published under that code where the unit is absent that year. */
export function foldBudgetAliases(year: BudgetYear): BudgetYear {
  const orgs: BudgetYear['orgs'] = {}
  for (const [code, org] of Object.entries(year.orgs)) {
    const unit = unitCodeOf(code)
    if (unit === code || !(unit in year.orgs)) orgs[unit] = org
  }
  return {
    ...year,
    orgs,
    rows: year.rows.map((row) => {
      const org = unitCodeOf(row.org)
      return org === row.org ? row : { ...row, org }
    }),
  }
}

/** A Fall year as the site reads it, with unit aliases folded. */
export const foldedFallYearSchema = fallYearSchema.transform(foldUnitAliases)

/** A budget year as the site reads it, with unit aliases folded. */
export const foldedBudgetYearSchema =
  budgetYearSchema.transform(foldBudgetAliases)

/** A department code in a URL search param, as the site counts it: a code joined to a unit becomes the unit's, so an old or shared link still finds its jobs. */
export const unitCodeParam = orgCodeParam.transform(unitCodeOf)
