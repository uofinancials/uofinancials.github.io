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
