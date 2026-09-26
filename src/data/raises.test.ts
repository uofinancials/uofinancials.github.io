import { expect, test } from 'vitest'
import { raiseTermsSchema } from './raises'

const TERM = {
  employeeGroup: 'UOPA',
  appliesTo: 'Police officers',
  populations: ['police-officers'],
  kind: 'across-the-board',
  percent: '3.8',
  amountCents: null,
  effectiveDate: '2024-07-01',
  effectiveBetween: null,
  note: null,
  source: {
    url: 'https://example.org/cba.pdf',
    document: 'CBA',
    location: 'p. 1',
    retrievedOn: '2026-09-24',
  },
}

function parse(term: object) {
  return raiseTermsSchema.safeParse({ terms: [term], gaps: [] })
}

test('an across-the-board percent is also read as whole basis points', () => {
  const terms = ['3.8', '6.50', '10', '1.62'].map((percent) => {
    const term = parse({ ...TERM, percent }).data?.terms[0]
    return term?.kind === 'across-the-board' && term.basisPoints
  })
  expect(terms).toEqual([380, 650, 1000, 162])
  expect(parse({ ...TERM, percent: '1.625' }).success).toBe(false)
})

test("a term names only its own group's populations, and a dateless one its window", () => {
  expect(parse(TERM).success).toBe(true)
  expect(parse({ ...TERM, populations: ['pro-tem'] }).success).toBe(false)
  expect(parse({ ...TERM, populations: [] }).success).toBe(false)
  const dateless = { ...TERM, effectiveDate: null, note: 'Ratified in April.' }
  expect(parse(dateless).success).toBe(false)
  const windowed = parse({
    ...dateless,
    effectiveBetween: { from: '2025-04-01', to: '2025-05-01' },
  }).data?.terms[0]
  expect(windowed?.kind === 'across-the-board' && windowed.effective).toEqual({
    from: '2025-04-01',
    to: '2025-05-01',
  })
  expect(
    parse({
      ...TERM,
      effectiveBetween: { from: '2025-04-01', to: '2025-05-01' },
    }).success,
  ).toBe(false)
})

test('a merit or equity pool names its populations, with basis points when its percent allows', () => {
  const pool = {
    ...TERM,
    kind: 'merit-pool',
    effectiveBetween: undefined,
  }
  const { effectiveBetween: _, ...merit } = pool
  const read = (percent: string) => {
    const term = parse({ ...merit, percent }).data?.terms[0]
    return term?.kind === 'merit-pool' ? term.basisPoints : undefined
  }
  expect([read('3.75'), read('3'), read('1.625')]).toEqual([375, 300, null])
  expect(
    parse({ ...merit, kind: 'equity-pool', populations: [] }).success,
  ).toBe(false)
  expect(parse({ ...merit, populations: ['pro-tem'] }).success).toBe(false)
  const { populations: __, ...unscoped } = merit
  expect(parse(unscoped).success).toBe(false)
})
