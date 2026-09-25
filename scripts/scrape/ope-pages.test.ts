import { expect, test } from 'vitest'
import {
  combineOpePages,
  readCurrentRates,
  readPersRepayment,
  readRateGroups,
  readRateHistory,
  toBasisPoints,
} from './ope-pages.ts'

const CURRENT = `<table><thead><tr>
  <th>Employee Group</th><th>Avg Leave Adjustable Rate</th><th>Fiscal Year 2031</th>
  <th>Avg Leave Adjustable Rate</th><th>Estimated Fiscal Year 2032</th></tr></thead>
  <tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>Group&nbsp;One</td><td>10.67%</td><td>77.4%</td><td>TBD</td><td>TBD</td></tr>
  <tr><td>Group Two</td><td>Faculty .92%; Exec 9.57%</td><td>51.1%</td><td>Faculty TBD; Exec TBD</td><td>TBD</td></tr>
  </tbody></table>
  <table><tbody>
  <tr><td>Fund Type</td><td>Description</td><td>FY29/FY30</td><td>FY31</td></tr>
  <tr><td>FT 11</td><td>E&amp;G</td><td>1.26%</td><td>&nbsp;.72%</td></tr>
  </tbody></table>`

const HISTORY = `<table><thead><tr><th><strong>Employee Type</strong></th>
  <th>Fiscal Year 2029</th><th><h6>Fiscal Year 2030 &amp; 2031</h6></th></tr></thead>
  <tbody><tr><td>Group One</td><td>33%</td><td><p>74.9%</p></td></tr></tbody></table>`

const MATRIX = `<table><tbody><tr></tr>
  <tr><th>Employee Group</th><th>EClass Code</th><th>Account Code</th><th>Description</th></tr>
  <tr><td>Group One</td><td>AA, AB</td><td>10922</td><td><p>Salaried staff.</p></td></tr>
  <tr><td>Group Two</td><td>All department employees</td><td>10923</td><td>Everyone in 480000.</td></tr>
  </tbody></table>`

test('converts published percentages to basis points', () => {
  expect(toBasisPoints('77.4%')).toBe(7740)
  expect(toBasisPoints('10.67%')).toBe(1067)
  expect(toBasisPoints('.72%')).toBe(72)
  expect(toBasisPoints(' 33% ')).toBe(3300)
  expect(() => toBasisPoints('TBD')).toThrow(/not a percentage/)
  expect(() => toBasisPoints('%')).toThrow(/not a percentage/)
})

test('reads the current table, skipping estimates and splitting a two-value leave cell', () => {
  expect(readCurrentRates(CURRENT)).toEqual({
    opeRates: [
      {
        fiscalYear: 2031,
        group: 'Group One',
        basisPoints: 7740,
        source: 'current',
      },
      {
        fiscalYear: 2031,
        group: 'Group Two',
        basisPoints: 5110,
        source: 'current',
      },
    ],
    leaveRates: [
      {
        fiscalYear: 2031,
        group: 'Group One',
        appliesTo: null,
        basisPoints: 1067,
      },
      {
        fiscalYear: 2031,
        group: 'Group Two',
        appliesTo: 'Faculty',
        basisPoints: 92,
      },
      {
        fiscalYear: 2031,
        group: 'Group Two',
        appliesTo: 'Exec',
        basisPoints: 957,
      },
    ],
  })
})

test('reads PERS repayment with merged fiscal-year columns', () => {
  expect(readPersRepayment(CURRENT)).toEqual([
    {
      fundType: '11',
      description: 'E&G',
      fiscalYears: [2029, 2030],
      basisPoints: 126,
    },
    {
      fundType: '11',
      description: 'E&G',
      fiscalYears: [2031],
      basisPoints: 72,
    },
  ])
})

test('reads the history, expanding a merged two-year column', () => {
  expect(readRateHistory(HISTORY)).toEqual([
    {
      fiscalYear: 2029,
      group: 'Group One',
      basisPoints: 3300,
      source: 'history',
    },
    {
      fiscalYear: 2030,
      group: 'Group One',
      basisPoints: 7490,
      source: 'history',
    },
    {
      fiscalYear: 2031,
      group: 'Group One',
      basisPoints: 7490,
      source: 'history',
    },
  ])
})

test('reads the matrix, keeping codes only when every entry is a code', () => {
  expect(readRateGroups(MATRIX)).toEqual([
    {
      name: 'Group One',
      eclassCodes: ['AA', 'AB'],
      accountCode: '10922',
      description: 'Salaried staff.',
    },
    {
      name: 'Group Two',
      eclassCodes: [],
      accountCode: '10923',
      description: 'Everyone in 480000.',
    },
  ])
})

test('fails when a page changes shape or names an unknown group', () => {
  expect(() =>
    readCurrentRates(CURRENT.replace('Fiscal Year 2031', 'FY 2031')),
  ).toThrow(/unexpected header/)
  expect(() =>
    readRateHistory('<table><tr><td>Other</td></tr></table>'),
  ).toThrow(/no table headed "Employee Type"/)
  expect(() =>
    combineOpePages({
      current: CURRENT,
      history: HISTORY.replace('Group One', 'Group Nine'),
      matrix: MATRIX,
    }),
  ).toThrow(/rate groups not in the matrix: Group Nine/)
})
