import type { BudgetYear } from '../../data/budget.ts'
import type { FallRecord, FallYear } from '../../data/fall.ts'
import type { FyYear } from '../../data/fy.ts'
import type { FyTemps, FyTempsUnit } from '../../data/fy-temps.ts'
import type { Manifest } from '../../data/manifest.ts'
import { foldDepartment } from '../../data/unit-aliases.ts'
import { fiscalYearOf, isClassifiedTemp } from '../census/totals.ts'
import type { TempsFigure } from '../trends/trends.ts'
import { createFyCodeResolver, type FyDepartmentCode } from './fy-codes.ts'
import { type DepartmentCensus, toDepartmentCensuses } from './jobs.ts'

const HUNDREDTHS = 100

type FyTempsInputs = {
  manifest: Manifest
  falls: FallYear[]
  budgets: BudgetYear[]
  fys: FyYear[]
}

/** Each fiscal year's classified temporaries' FY pay, summed by the unit and area the site places their department in, with an estimated FTE. */
export function buildFyTemps({
  manifest,
  falls,
  budgets,
  fys,
}: FyTempsInputs): FyTemps {
  const censuses = toDepartmentCensuses(manifest, falls, budgets)
  return {
    years: fys.flatMap(({ fiscalYear, records }) => {
      const census =
        censuses[
          falls.findIndex(
            ({ censusDate }) => fiscalYearOf(censusDate) === fiscalYear,
          )
        ]
      if (!census) return []
      const resolve = createFyCodeResolver(fiscalYear, { falls, budgets })
      return [
        {
          fiscalYear,
          censusYear: census.year,
          units: placeTemps(records, census, resolve),
        },
      ]
    }),
  }
}

function placeTemps(
  records: FyYear['records'],
  census: DepartmentCensus,
  resolve: (name: string) => FyDepartmentCode,
): FyTempsUnit[] {
  const rates = averageRates(census)
  const units = new Map<string, Omit<FyTempsUnit, 'fteHundredths'>>()
  for (const record of records.filter(isClassifiedTemp)) {
    const resolved = resolve(record.payDepartment)
    if (resolved.basis === 'unresolved') {
      throw new Error(
        `FY department "${record.payDepartment}" beside Fall ${census.year} resolves to no code`,
      )
    }
    const payDepartment = foldDepartment({
      code: resolved.code,
      name: record.payDepartment,
    })
    const code = payDepartment.code ?? resolved.code
    const unit = units.get(code) ?? {
      code,
      area: census.assign({ payDepartment }).area,
      jobs: 0,
      payCents: 0,
    }
    unit.jobs += 1
    unit.payCents += record.totalPayCents
    units.set(code, unit)
  }
  return [...units.values()]
    .map((unit) => ({
      ...unit,
      fteHundredths: Math.round((unit.payCents / rates(unit)) * HUNDREDTHS),
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

/** The average annual rate of the census's temporaries in a unit, else in its area, else at UO. */
function averageRates(
  census: DepartmentCensus,
): (unit: { code: string; area: string | null }) => number {
  const temps = census.records.filter(isClassifiedTemp)
  const byUnit = groupRates(temps, ({ payDepartment }) => payDepartment.code)
  const byArea = groupRates(temps, (record) => census.assign(record).area)
  const all = mean(
    temps.map(({ annualSalaryRateCents }) => annualSalaryRateCents),
  )
  return ({ code, area }) =>
    byUnit.get(code) ?? (area === null ? undefined : byArea.get(area)) ?? all
}

function groupRates(
  records: FallRecord[],
  keyOf: (record: FallRecord) => string | null,
): Map<string, number> {
  const rates = new Map<string, number[]>()
  for (const record of records) {
    const key = keyOf(record)
    if (key === null) continue
    const values = rates.get(key) ?? []
    values.push(record.annualSalaryRateCents)
    rates.set(key, values)
  }
  return new Map([...rates].map(([key, values]) => [key, mean(values)]))
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** A census's classified temporaries' FY pay by unit; none when its fiscal year publishes no pay. */
export function censusTemps(
  fyTemps: FyTemps,
  censusYear: number,
): FyTempsUnit[] {
  return (
    fyTemps.years.find((year) => year.censusYear === censusYear)?.units ?? []
  )
}

/** The site-wide total, an area's units (`null` for those placed in no area), or one unit. */
export type TempsScope =
  | { kind: 'all' }
  | { kind: 'area'; code: string | null }
  | { kind: 'unit'; code: string }

export function isInScope(unit: FyTempsUnit, scope: TempsScope): boolean {
  if (scope.kind === 'all') return true
  return scope.kind === 'area'
    ? unit.area === scope.code
    : unit.code === scope.code
}

/** A scope's classified temporaries' FY figures by census year, in every census whose fiscal year publishes pay, zero where it paid none. */
export function tempsByCensus(
  fyTemps: FyTemps,
  scope: TempsScope,
): Map<number, TempsFigure> {
  return new Map(
    fyTemps.years.map(({ fiscalYear, censusYear, units }) => {
      const inScope = units.filter((unit) => isInScope(unit, scope))
      const sum = (pick: (unit: FyTempsUnit) => number) =>
        inScope.reduce((total, unit) => total + pick(unit), 0)
      return [
        censusYear,
        {
          fiscalYear,
          jobs: sum(({ jobs }) => jobs),
          payCents: sum(({ payCents }) => payCents),
          fteHundredths: sum(({ fteHundredths }) => fteHundredths),
        },
      ]
    }),
  )
}
