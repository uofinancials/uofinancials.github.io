import type {
  AcrossTheBoardTerm,
  EmployeeGroup,
  PoolTerm,
  Population,
} from '@/data/raises'

const SOURCE = {
  url: 'https://example.org/cba.pdf',
  document: 'CBA',
  location: 'p. 1',
  retrievedOn: '2026-09-24',
}

const PERCENT_BASIS_POINTS = 100

/** A parsed across-the-board term effective on one date. */
export function acrossTheBoardTerm(
  employeeGroup: EmployeeGroup,
  basisPoints: number,
  effectiveDate: string,
  populations: Population[] = ['all'],
): AcrossTheBoardTerm {
  return {
    kind: 'across-the-board',
    employeeGroup,
    appliesTo: 'Test',
    populations,
    percent: String(basisPoints / PERCENT_BASIS_POINTS),
    basisPoints,
    amountCents: null,
    effectiveDate,
    effectiveBetween: null,
    effective: { from: effectiveDate, to: effectiveDate },
    note: null,
    source: SOURCE,
  }
}

export function poolTerm(
  employeeGroup: EmployeeGroup,
  basisPoints: number | null,
  effectiveDate: string | null,
  populations: Population[] = ['all'],
): PoolTerm {
  return {
    kind: 'merit-pool',
    employeeGroup,
    appliesTo: 'Test',
    populations,
    percent:
      basisPoints === null
        ? '1.625'
        : String(basisPoints / PERCENT_BASIS_POINTS),
    basisPoints,
    amountCents: null,
    effectiveDate,
    note: effectiveDate === null ? 'Paid on ratification.' : null,
    source: SOURCE,
  }
}
