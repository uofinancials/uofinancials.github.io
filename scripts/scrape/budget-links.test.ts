import { expect, test } from 'vitest'
import { readBudgetLinks } from './budget-links.ts'

const PAGE = 'https://example.org/content/Budget-Reports'

function page(section: string): string {
  return `<article><div class="field--name-body">
    <h2>Budget and Expenditure Authorizations</h2>
    <ul><li><a href="/files/FY26 Budget Expenditure Report.pdf">FY26</a></li></ul>
    <h2>Expenditure Budget Reports</h2>
    <p>Budget reports exclude ...</p>
    ${section}
  </div></article>`
}

test('reads the workbook links under the expenditure heading', () => {
  const links = readBudgetLinks(
    page(`<ul>
      <li><a href="https://files.example.org/brp/FY31_External_Budget_Report_PD02.xlsx">FY31&nbsp;PD02</a></li>
      <li><a href="/brp/FY30_External_Budget_Report_PD14.xlsx">FY30</a></li>
    </ul>`),
    PAGE,
  )
  expect(links).toEqual([
    {
      fiscalYear: 2031,
      period: '02',
      fileName: 'FY31_External_Budget_Report_PD02.xlsx',
      url: 'https://files.example.org/brp/FY31_External_Budget_Report_PD02.xlsx',
    },
    {
      fiscalYear: 2030,
      period: '14',
      fileName: 'FY30_External_Budget_Report_PD14.xlsx',
      url: 'https://example.org/brp/FY30_External_Budget_Report_PD14.xlsx',
    },
  ])
})

test('fails when the page changes shape', () => {
  expect(() => readBudgetLinks('<h2>Other</h2>', PAGE)).toThrow(
    /expected one "Expenditure Budget Reports" heading/,
  )
  expect(() => readBudgetLinks(page('<ul></ul>'), PAGE)).toThrow(
    /no budget workbooks/,
  )
  expect(() =>
    readBudgetLinks(
      page('<ul><li><a href="/x/Budget.xlsx">x</a></li></ul>'),
      PAGE,
    ),
  ).toThrow(/unexpected budget file name "Budget.xlsx"/)
})

test('fails when a fiscal year has more than one workbook', () => {
  expect(() =>
    readBudgetLinks(
      page(`<ul>
        <li><a href="/b/FY31_External_Budget_Report_PD02.xlsx">a</a></li>
        <li><a href="/b/FY31_External_Budget_Report_PD03.xlsx">b</a></li>
      </ul>`),
      PAGE,
    ),
  ).toThrow(/more than one workbook for a fiscal year/)
})
