import { expect, test } from 'vitest'
import type { Manifest } from '@/data/manifest'
import type { RaiseTerm } from '@/data/raises'
import { citeSource, listCitedDocuments } from './citation'

const HASH = 'a'.repeat(64)

const MANIFEST: Manifest = {
  fall: [
    {
      year: 2025,
      censusDate: '2025-11-01',
      sourcePage: 'https://example.org/salary-reports',
      files: [
        {
          kind: 'classified',
          fileName: 'Classified.pdf',
          sha256: HASH,
          pages: 1,
          extractDate: '2025-11-05',
          retrievedOn: '2026-09-20',
          records: 1,
          possibleStudents: 0,
        },
        {
          kind: 'unclassified',
          fileName: 'Unclassified.pdf',
          sha256: HASH,
          pages: 1,
          extractDate: '2025-11-05',
          retrievedOn: '2026-09-24',
          records: 1,
          possibleStudents: 0,
        },
      ],
    },
  ],
  budget: [
    {
      fiscalYear: 2027,
      period: '02',
      sourcePage: 'https://example.org/budget-reports',
      fileName: 'FY27.xlsx',
      url: 'https://example.org/FY27.xlsx',
      sha256: HASH,
      lastModified: null,
      retrievedOn: '2026-09-23',
      rows: 1,
      totalExpenditureBudgetCents: 100,
    },
  ],
  rates: {
    pages: [
      {
        url: 'https://example.org/Blended-OPE',
        sha256: HASH,
        lastModified: null,
        retrievedOn: '2026-09-22',
      },
      {
        url: 'https://example.org/Blended-OPE-Rate-History',
        sha256: HASH,
        lastModified: null,
        retrievedOn: '2026-09-24',
      },
    ],
    groups: 1,
    opeRates: 1,
    leaveRates: 1,
    persRepayment: 1,
  },
}

test('a Fall year cites its reports page and the latest retrieval', () => {
  expect(citeSource(MANIFEST, { kind: 'fall', year: 2025 })).toEqual({
    dataset: 'Fall 2025 Census salary reports',
    publisher: 'UO Office of Data Enablement',
    href: 'https://example.org/salary-reports',
    retrievedOn: '2026-09-24',
    anchor: 'fall-2025',
  })
})

test('a budget year cites the budget reports page', () => {
  expect(citeSource(MANIFEST, { kind: 'budget', fiscalYear: 2027 })).toEqual({
    dataset: 'FY27 operational expenditure budget',
    publisher: 'UO Budget and Resource Planning',
    href: 'https://example.org/budget-reports',
    retrievedOn: '2026-09-23',
    anchor: 'budget-fy27',
  })
})

test('the rates cite the current OPE page and the latest retrieval', () => {
  expect(citeSource(MANIFEST, { kind: 'rates' })).toMatchObject({
    href: 'https://example.org/Blended-OPE',
    retrievedOn: '2026-09-24',
    anchor: 'rates',
  })
})

test('a source missing from the manifest fails with its name', () => {
  expect(() => citeSource(MANIFEST, { kind: 'fall', year: 2014 })).toThrow(
    'No manifest entry for Fall 2014',
  )
  expect(() =>
    citeSource({ ...MANIFEST, rates: null }, { kind: 'rates' }),
  ).toThrow('No manifest entry for the OPE rates')
})

function term(url: string, retrievedOn: string): RaiseTerm {
  return {
    kind: 'across-the-board',
    employeeGroup: 'SEIU 503',
    appliesTo: 'all',
    effectiveDate: '2024-04-01',
    note: null,
    percent: '6.5',
    amountCents: null,
    source: { url, document: `Doc ${url}`, location: 'p. 1', retrievedOn },
  }
}

test('cited documents are listed once each with their term counts', () => {
  expect(
    listCitedDocuments([
      term('https://example.org/a', '2026-09-20'),
      term('https://example.org/b', '2026-09-24'),
      term('https://example.org/a', '2026-09-24'),
    ]),
  ).toEqual([
    {
      url: 'https://example.org/a',
      document: 'Doc https://example.org/a',
      retrievedOn: '2026-09-24',
      terms: 2,
    },
    {
      url: 'https://example.org/b',
      document: 'Doc https://example.org/b',
      retrievedOn: '2026-09-24',
      terms: 1,
    },
  ])
})
