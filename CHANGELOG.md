# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Site skeleton deployed to GitHub Pages.
- University of Oregon Fall Census salary records for every census from 2014 to
  2025 - 80,692 job records, classified and unclassified, from the salary
  reports on the Office of Data Enablement's salary reports page, retrieved
  2026-09-24 - as one JSON file per year under `public/data/fall/`. Each record
  keeps every field the report publishes, with its source page number.
- A data manifest listing each source report's file name, SHA-256, page count,
  extract date, retrieval date, and record count.
- Records whose job title suggests a student or graduate employee are marked
  `possibleStudent`.
- `pnpm scrape [fall|budget|rates]`, which rebuilds the data. The Fall step
  reads Fall Census PDFs downloaded into `.cache/sources/fall/`, and refuses to
  write a year with any unreadable record or a missing or duplicate report.
- University of Oregon operational expenditure budgets for FY21-FY27 - 67,935
  budget rows by department, fund, account type, and posting period, from the
  Budget and Resource Planning office's Budget Reports page, retrieved
  2026-09-24 - as one JSON file per fiscal year under `public/data/budget/`,
  with per-year names for departments, funds, fund types, and account types.
  FY26 reflects posting period 12 and FY27 period 2; the rest are year-end.
- The budget step downloads the workbooks itself: it obeys each host's
  `robots.txt`, identifies itself, waits between requests, and re-downloads a
  workbook only when it has changed. A fiscal year is not written if any row
  fails to read or its published totals do not add up.
- Manifest entries for each budget workbook: URL, posting period, SHA-256,
  last-modified date (null where the server does not state one), retrieval date,
  row count, and total.
- Blended OPE (fringe benefit) rates from the Budget and Resource Planning
  office, retrieved 2026-09-24, in `public/data/ope.json`: OPE rates for nine
  employee rate groups for FY20-FY27, FY27 average leave adjustable rates, PERS
  side-account repayment rates by fund type for FY24-FY27, and each group's
  EClass codes. Percentages are stored as integer basis points.
- Raise terms in `public/data/raises.json`: 59 across-the-board, merit-pool,
  equity-pool, step, longevity, and one-time terms for United Academics faculty,
  SEIU 503 and Teamsters 206 classified staff, UO police, and officers of
  administration, 2013-2026, each citing its agreement or UO page, section, and
  page, with percentages as published. Ten years-and-groups with no public
  source are listed as gaps.
- Person links between consecutive Fall Census years: a name is linked to the
  same name in the next year when each year lists exactly one primary job for it
  and both are in the same pay department. The links are computed, not published
  by UO; the committed 2014-2025 data (retrieved 2026-09-24) yields 52,880.
- Pages share one layout: a header with the site name and navigation, and the
  footer with the independence notice and the error report link. Paths the site
  does not have show a not-found page inside that layout, and every path loads
  directly on GitHub Pages.
- A Sources page (`/sources`) listing each Fall Census report, budget workbook,
  and OPE rate page the site uses - with its retrieval date, SHA-256, and
  counts - and every document the raise terms cite.
- Figures can carry a source caption naming the dataset and its publisher,
  linking to the source, and linking its retrieval date to the dataset's entry
  on the Sources page; a computed figure says how it was computed.
- The site follows the system's light or dark setting.
- A page whose data cannot load names the file that failed and offers a retry.
- The home page is an overview of the latest Fall census (Fall 2025): people,
  FTE, and estimated salary spend (published annual salary rate x FTE, zero for
  unpaid leave), and the same by EEO category and by college or VP area, each as
  a bar chart with a table and a source caption saying how it was computed.
  Classified temporaries, whose published rates are annualised hourly rates, are
  counted in people and FTE but kept out of salary spend and shown as their own
  row.
- College or VP areas come from the budget's organisation hierarchy for the
  census's fiscal year. Where UO does not publish a pay department's area, the
  site assigns it from the department's name, or by hand for 26 Fall 2025
  departments, and the page says how many jobs each way covers.
- A Trends page (`/trends`) showing salary spend, FTE, and median salary rate
  (the median published rate of primary jobs) for every Fall census from 2014 to
  2025, as a line chart with a year-by-year table. UO's EEO categories,
  restructured in 2018, 2019, and 2021, are mapped to seven groups that mean the
  same jobs in every year, and the page shows the mapping. Classified
  temporaries appear in FTE only; dollars are as published, not adjusted for
  inflation.
- The Trends view is set from the page and kept in its link: the measure, one
  group opened into its categories as UO publishes them, classified or
  unclassified staff, the range of years, and which lines are hidden. One source
  caption cites the census reports for the years shown.
- Fall 2015 classified temporaries, which the 2015 report publishes without a
  position class, are recognised as temporaries.
- A Departments page (`/departments`) listing each college or VP area in the
  FY26 budget with its budget units and the Fall 2025 pay departments placed in
  it, each with its FY26 budget and Fall 2025 job count, and a filter by name or
  code.
- A page per department code (`/departments/<code>`). It shows the code's budget
  for FY21-FY27 by account group or fund type, with every account type in a
  table. The budget is UO's Total Expenditure Budget as published, labelled as
  including reserves and transfers and excluding sponsored funds; FY26 and FY27
  are labelled with their posting period.
- The same page shows the code's jobs from Fall 2014 to 2025 by group, as on the
  Trends page, and one census's jobs by rank and position class. An area's jobs
  are those the site places in it, with a table of how each year's jobs were
  placed. The budget and the census are joined only where their codes match
  exactly, and the page says when a source publishes nothing under the code.
- To keep the page an aggregate, spend and median salary rate are left blank for
  any figure covering fewer than three jobs, and ranks or classes with fewer
  than three jobs are shown together.
- The department page's view is kept in its link: the budget breakdown, the
  measure, classified or unclassified staff, and the census of the class table.
- A Salaries page (`/salaries`) showing how many jobs fall in each $10,000 range
  of published annual salary rate, up to a "$250,000 and over" range, for one
  Fall census, as a bar chart split by the Trends page's employee groups and a
  table of the same counts. Beside it are each group's job count, the 10th to
  90th percentile rates of primary jobs (temporaries left out), and the highest
  rate.
- The Salaries view is set from the page and kept in its link: the census, one
  group, classified or unclassified staff, 9- or 12-month terms, and a college
  or VP area. Each department page links to its own distribution, shown as a
  filter that can be removed. A filter matching fewer than three jobs shows only
  the count, and percentiles need three primary jobs.
- A People page (`/people`) that searches every Fall census from 2014 to 2025 by
  name: each word typed must appear in the name, and up to 50 matching names are
  listed with the years they appear in and the pay department of their latest
  primary job, with the source reports cited beneath. The search, the chosen
  name, and its census year are kept in the link, and the page asks search
  engines not to index it. Records marked `possibleStudent` are shown as
  published.
- A chosen name shows, from top to bottom:
  - figures computed by this site from that name's own records, each with its
    method and caveats: years since the earliest published job start, and, over
    years linked on the exact name and the same pay department of a single
    primary job, the primary job's rate change and its average yearly change
    (leaving out years whose appointment or term changed);
  - a chart and table of each job's published annual salary rate by census, a
    job being its job type and pay department, with an estimated total of rate x
    appointment;
  - census tabs, each with every field the report publishes for that year's
    jobs, its citation, and links to the pay department's page and salary
    distribution;
  - a job history of title, class or rank, pay department, job type,
    appointment, and term for every census.
- A People link in the navigation, which now wraps on narrow screens.
