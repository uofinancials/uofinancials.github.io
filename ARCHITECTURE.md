# UO Financials Architecture

## Overview

UO Financials is a static single-page site built with Vite and React. GitHub
Pages serves it from the `uofinancials.github.io` repository. An import script
turns the University of Oregon's Fall Census salary report PDFs, its operational
expenditure budget workbooks, and its blended OPE rate pages into JSON files
committed under `public/data/`. Raise terms from collective bargaining
agreements and the E&G fund projection from Board of Trustees materials are
entered by hand. The site reads nothing but its bundle and those files.

## Data

- Fall Census salary reports - classified and unclassified PDFs, one pair per
  census year, published on the Office of Data Enablement's salary reports page
  and downloaded by hand into the gitignored `.cache/sources/fall/`.
- Operational expenditure budgets - one XLSX workbook per fiscal year, linked
  from the Budget and Resource Planning office's Budget Reports page and
  downloaded by `scripts/scrape` into the gitignored `.cache/sources/budget/`.
- Blended OPE rate pages - three Budget and Resource Planning pages (current
  rates, rate history, rate-group matrix), downloaded by `scripts/scrape` into
  the gitignored `.cache/sources/rates/`.
- Collective bargaining agreements and UO salary announcements - read by hand
  for `public/data/raises.json`.
- Board of Trustees meeting materials and president's office budget pages - read
  by hand for `public/data/outlook.json`.
- `public/data/fall/<year>.json` - one census year's job records; written by
  `scripts/scrape`.
- `public/data/budget/FY<yy>.json` - one fiscal year's budget rows by
  department, fund, account type, and posting period, with that year's names;
  written by `scripts/scrape`.
- `public/data/ope.json` - OPE, leave, and PERS repayment rates by rate group
  and year, and the rate groups; written by `scripts/scrape`.
- `public/data/raises.json` - raise terms by employee group, each with its
  citation and, for across-the-board and pool terms, the populations it applies
  to, and the recorded gaps; edited by hand.
- `public/data/outlook.json` - the E&G fund projection by fiscal year with every
  published line, its alternative cases and assumptions, run rates reported
  since, the all-funds budget, and announced budget actions, each with its
  citation; edited by hand.
- `public/data/manifest.json` - each dataset's source files and their hashes,
  dates, and counts; written by `scripts/scrape`.

## Flow

```mermaid
flowchart LR
  pdfs[Fall Census PDFs] --> scrape[scripts/scrape]
  xlsx[Budget workbooks] --> scrape
  html[OPE rate pages] --> scrape
  cba[Agreements] --> hand[Hand entry]
  board[Board materials] --> hand
  hand --> json[public/data]
  scrape --> json[public/data]
  json --> site[src]
  site --> reader[Reader]
```

## Systems

### Site (`src/`)

- `src/main.tsx` - creates the query client and router and mounts the app.
- `src/app.tsx` - the query and router providers.
- `src/router.tsx` - the route tree, each route's data loading, and the default
  loading, error, and not-found pages.
- `src/pages` - one component per route.
- `src/components` - the shared layout with the independence notice and error
  report link, the page section, the source citation caption and cited-source
  line, the loading and error states, the select, radio, search, and draft text
  fields, the totals chart and table, the line chart, the stacked bar chart, the
  trends table and controls, the department budget and jobs sections, the
  department table, the sortable column header, the census filter controls, the
  salary distribution figure, the removable filter, the pay changes section with
  its lines, counts table, distribution, and raise comparison, the people list's
  controls, table, sort controls, column picker, and group figure, the person
  view with its computed figures, rate chart, records table, and job history,
  the budget outlook's lines and cases tables, the scenario rule list, rule
  editor, scope fields, savings, eliminations, and raise rates tables, savings
  total, and outlook section, and the hooks and query that load one census's
  placed jobs, the people list's matching jobs, the pay changes of a Trends
  view, the name index, a scenario and its result, and the censuses a hiring
  freeze reads.
- `src/components/ui` - shadcn/ui components.
- `src/data` - the schemas and types of the committed data files, and the
  queries that fetch and parse them.
- `src/lib` - census totals by group, college or VP area assignment, the
  cross-year employee groups and their trends, budget account groups, a
  department's budget and jobs, the department index, the department table's
  rows with their year-on-year changes, sort order for tables, the salary rate
  distribution, each page's URL state, source citations, number formatting, the
  person links between consecutive Fall years, the person lookup (name index,
  name matching, linked runs, and a record's published fields), the people
  list's filtering, sorting, and paging of one census's jobs, a person's
  computed figures, rates by job, job history, a job's class or rank and the
  medians beside it, continuing jobs' pay changes with the rank renames and
  title abbreviations they use, a job's estimated raise group, and each raise
  group's median change beside its compounded across-the-board terms, the budget
  outlook's gap by year, chart series, and cited sources, and scenarios: a job's
  estimated OPE rate group, each area's estimated E&G share, rules over one
  census, the hiring freeze and the censuses it reads, department and area
  eliminations by budget line and the budget year they use, raise freezes and
  each raise group's rate they forgo, savings against the projection or one of
  its cases, the rules' and case's URL form, rule and scope labels, new rules
  and their order, and example scenarios.
- `src/test` - shared test fixtures.

### Import (`scripts/`)

- `scripts/scrape/main.ts` - the `pnpm scrape [dataset]` command: runs the
  dataset steps and writes the manifest.
- `scripts/scrape/fall.ts` - the Fall step: reads the downloaded reports and
  writes the year files.
- `scripts/scrape/budget.ts` - the budget step: downloads the workbooks and
  writes the year files.
- `scripts/scrape/rates.ts` - the rates step: downloads the OPE pages and writes
  the rates file.
- `scripts/scrape/fetch.ts` - network access: robots.txt, identification,
  request spacing, and the conditional download cache.
- `scripts/scrape/robots.ts` - robots.txt rules.
- `scripts/scrape/manifest-file.ts` - reading and writing the manifest.
- `scripts/scrape/pdf-lines.ts` - PDF pages as positioned text lines.
- `scripts/scrape/fall-file.ts` - one Fall Census report: its identity and its
  records.
- `scripts/scrape/fall-blocks.ts` - report pages split into labelled record
  blocks.
- `scripts/scrape/fall-record.ts` - a record block as a typed record.
- `scripts/scrape/mojibake.ts` - repair of the reports' encoding damage.
- `scripts/scrape/possible-student.ts` - the possible student or graduate
  employee flag.
- `scripts/scrape/budget-links.ts` - the workbook links on the Budget Reports
  page.
- `scripts/scrape/budget-file.ts` - one budget workbook as a typed budget year.
- `scripts/scrape/ope-pages.ts` - the OPE rate pages as typed rates.
- `scripts/scrape/cache.ts` - the source and data locations.
- `scripts/committed-data.test.ts` - schema and total checks of every committed
  data file.
- `scripts/committed-outlook.test.ts` - the budget outlook's published
  arithmetic: lines to totals, run rates, and fund balances.
- `scripts/committed-scenario.test.ts` - OPE rate groups, E&G shares, and
  scenario results on the committed data.

### End-to-end tests (`e2e/`)

- `e2e/home.spec.ts` - the built site's routes, notice, overview, trends,
  departments, the people list and person page, sources page, and `404.html`.
- `e2e/budget.spec.ts` - the budget page's gap by year, scope, cases, and
  sources.
- `e2e/scenarios.spec.ts` - the scenarios page's examples, rule editing, hiring
  and raise freezes, eliminations, cases, unreadable link entries, and narrow
  layout.
- `e2e/trends-change.spec.ts` - the Trends pay change measure, its filters, its
  raise comparison, and its link from the person page.

## Pages

- `/` - the overview: people, FTE, and salary spend for the latest Fall census,
  by EEO category and by college or VP area; driven by `src/lib` totals and area
  assignment over one Fall year and one budget year.
- `/trends` - salary spend, FTE, and median salary rate by employee group for
  every Fall census, or for continuing jobs in each pair of consecutive censuses
  the median change in salary rate, the counts of changed class, rank, and
  title, and one pair's distribution of changes and median change by raise group
  beside its across-the-board terms; filtered by pay department or class or
  rank, with the view held in the URL; driven by `src/lib` groups, trends,
  person links, pay changes, and the raise comparison over every Fall year and
  the raise terms.
- `/departments` - a sortable table of the colleges and VP areas in the latest
  census's budget year, or of their units and pay departments, with budget,
  jobs, spend, and median and each one's change from the year before, filtered
  by area and by name or code; driven by the `src/lib` department table over the
  latest two Fall years and their budget years.
- `/departments/$code` - one code's budget by account group or fund type for
  every budget year, its jobs by group for every Fall census, its jobs by rank
  and position class in one census, for an area its units in the department
  table and how its jobs were placed, and links to a scenario eliminating it and
  to its Trends pay changes; driven by the `src/lib` department modules over
  every Fall and budget year, and the outlook file for the scenario's budget
  year.
- `/people` - one Fall census's jobs by name, filtered, sorted, and paged, with
  charts of the matching jobs by salary rate, with primary-job percentiles, and
  by group, and names from other censuses when a name has no job in it; not
  indexed by search engines; driven by the `src/lib` people list and
  distribution over one Fall year and its budget year.
- `/people/$name` - one name's computed figures, its rates by job over time, its
  records for one census at a time, and its job history, with a back button; not
  indexed by search engines; driven by the `src/lib` person lookup and summary
  over every Fall year.
- `/budget` - the E&G fund projection: the gap and fund balance by fiscal year
  as a chart and table, every published line, the alternative cases, the
  reduction estimate, the all-funds budget, the stated assumptions, and the
  announced budget actions, each cited; driven by the `src/lib` budget outlook
  over the outlook file.
- `/scenarios` - rules stacked over the latest Fall census, edited in place,
  with each rule's jobs and salary, full cost, and E&G savings, each
  elimination's budgeted pay, OPE, and S&S, the raise rates a raise freeze
  forgoes with their sources, the savings set against the E&G projection or one
  of its cases by fiscal year, example questions, the stated methods, and the
  sources, with the rules and case held in the URL; driven by the `src/lib`
  scenario modules over one Fall year, its budget year, the budget year of the
  first savings year, the OPE rates, the raise terms, and the outlook file, and
  every Fall year from 2019 when a hiring freeze is present.
- `/sources` - every source file in the manifest and every document the raise
  terms and the budget outlook cite, with retrieval dates, hashes, and counts;
  driven by `src/data` and `src/lib`.
- Any other path - the not-found page, inside the shared layout.

## Deployment

- `.github/workflows/ci.yml` - on every push and pull request, runs the checks,
  unit tests, and end-to-end tests; on `main`, publishes `dist/` to Pages.
- `pnpm build` writes `dist/404.html` as a copy of `index.html`, so Pages serves
  the app for every path.
