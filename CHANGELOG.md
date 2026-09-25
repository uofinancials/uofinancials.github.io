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
  source are listed as gaps. Each across-the-board term also records which part
  of its group it applies to (for United Academics, tenure-related, career
  instructional, career research, or pro tem faculty; for UOPA, police officers,
  dispatchers, or community service officers), read by this site from the term's
  published scope. The two terms whose day is not published record the window
  their source gives.
- Person links between consecutive Fall Census years: a name is linked to the
  same name in the next year when each year lists exactly one primary job for it
  and both are in the same pay department. The links are computed, not published
  by UO; the committed 2014-2025 data (retrieved 2026-09-24) yields 52,880.
- Pages share one layout, up to 1,200 pixels wide: a header with the site name
  and navigation, and the footer with the independence notice and the error
  report link. Paths the site does not have show a not-found page inside that
  layout, and every path loads directly on GitHub Pages.
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
  restructured in 2018, 2019, and 2021, are mapped to eight groups that mean the
  same jobs in every year, and the page shows the mapping. Classified
  temporaries appear in FTE only; dollars are as published, not adjusted for
  inflation.
- An Executives group - the president, provost, vice presidents, vice provosts,
  deans, and others in UO's Exec/Admin/Mgr (2014-2017) or Executive Admins
  (2018-2025) category, or with the OA salary grade EXEC that UO publishes from
  Fall 2016 - of 29 to 37 jobs a year in the committed data (retrieved
  2026-09-24). It is counted apart from Admins and professionals on every page
  that splits by group. Opened on the Trends page, the jobs placed by the grade
  alone form one line.
- On the Trends page, as on the department page, spend is left blank for any
  figure covering fewer than three paid jobs and median salary rate for fewer
  than three primary jobs.
- The Trends view is set from the page and kept in its link: the measure, one
  group opened into its categories as UO publishes them, classified or
  unclassified staff, the range of years, which lines are hidden, and a pay
  department or position class or rank filter, set from the person page, that
  narrows every measure and can be removed. One source caption cites the census
  reports for the years shown.
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
- To keep the page an aggregate, spend is left blank for any figure covering
  fewer than three paid jobs and median salary rate for fewer than three primary
  jobs, and ranks or classes with fewer than three jobs are shown together.
- The department page's view is kept in its link: the budget breakdown, the
  measure, classified or unclassified staff, and the census of the class table.
- A People page (`/people`) listing one Fall census's jobs by name, the latest
  by default, 50 to a page, with every published job field in a table (Fall
  2025: 6,840 jobs, 6,268 names, from the reports retrieved 2026-09-24):
  - filters by name and by title (each word typed must appear, with the census's
    titles suggested), EEO category, a published rate range in whole dollars
    with both ends included, the census, one of the Trends page's employee
    groups, classified or unclassified staff, 9- or 12-month terms, a college or
    VP area or department, and a position class or rank, each typed filter or
    department shown as a chip that removes it;
  - the number of matching jobs and names, and above the table two charts of the
    matching jobs, shown for three jobs or more: how many fall in each $10,000
    range of published annual salary rate, up to "$250,000 and over", split by
    group, with each group's count, the 10th to 90th percentile rates of primary
    jobs (temporaries left out), and the highest rate behind a toggle, where
    choosing a range sets the rate filter; and their count and median rate by
    group;
  - sorting by name, title, class or rank, pay department, rate, appointment,
    EEO category, or group, either way, ties by name;
  - a column selector, with class or rank, term, job type, and EEO category
    hidden by default;
  - a name with no job in the census listed with the censuses it appears in.
- The list is kept in its link, and the page asks search engines not to index
  it. Records marked `possibleStudent` are shown as published. The department
  and person pages link to it with their filters.
- Each name has its own page (`/people/<name>`), also not indexed, with a back
  button to the list. Old `/people?name=` links lead to it. It shows, from top
  to bottom:
  - figures computed by this site from that name's own records, each with its
    method and caveats: years since the earliest published job start, and, over
    years linked on the exact name and the same pay department of a single
    primary job, the primary job's rate change and its average yearly change
    (leaving out years whose appointment or term changed);
  - a chart and table of each job's published annual salary rate by census, a
    job being its job type and pay department, beside the computed median rate
    of the primary job's position class or rank in the same census and term
    (class number whatever its letter prefix, rank, or for unranked jobs the OA
    salary grade; primary jobs, temporaries left out, three jobs or more);
  - census tabs, each with every field the report publishes for that year's
    jobs, its citation, and links to the pay department's page, to the People
    list of that department and of each job's position class or rank, and to the
    Trends pay changes of that department and of the primary job's class or
    rank;
  - a job history of title, class or rank, pay department, job type,
    appointment, and term for every census.
- A Median change in salary rate measure on the Trends page, for continuing
  jobs, which are person links whose two primary jobs share their staff kind and
  9- or 12-month term, classified temporaries left out. For each pair of
  consecutive Fall censuses in the range, from 2014-15 to 2024-25, it shows:
  - the median change in published annual salary rate, overall and by employee
    group, or by EEO category in an opened group, as a line chart with a table
    (2024-25: 7.9% over 4,865 continuing jobs, from the reports retrieved
    2026-09-24);
  - how many changed position class (by class number, whatever its letter
    prefix), rank, or job title, each with its share, and how many have a rank
    UO did not publish;
  - for one chosen pair, a histogram and table of the changes in 1-point steps
    from -5% to 20%, split by group;
  - for the same pair, each raise group's median change beside the
    across-the-board increase its cited terms give between the two census dates,
    compounded, and the difference in points labelled as other than
    across-the-board (merit, steps, equity, promotions), an estimate for the
    group and never a person (2024-25: SEIU 503 10.8% against 6.6%, United
    Academics tenure-related 7.9% against 7.9%, from the census reports and the
    cited agreements and UO pages, retrieved 2026-09-24). The terms used are
    listed with their citations, and the groups' recorded gaps show as "No term
    recorded".
- Each continuing job is counted in the group, category, department, and class
  or rank of the earlier census. The chosen pair is kept in the link with the
  rest of the Trends view. A figure covering fewer than three jobs is not shown.
- A continuing job's raise group is estimated from its published class, rank, OA
  salary grade, and title, since UO publishes no bargaining unit: Teamsters 206,
  UOPA (from Fall 2017), and SEIU 503 by position class; United Academics by
  rank, split by title, tenure status, and research rank; officers of
  administration by OA grade. Executives, coaches, postdoctoral scholars, and
  police sergeants are in none, and the page counts them. The raise comparison
  applies every Trends filter except an opened group, and says so.
- Rank moves that UO relabelled are listed on the page and are not counted as
  rank or title changes: the 2025 career-instructor ranks, the 2015 postdoctoral
  and Early Childhood CARES ranks, and the 2016 administrators given a rank.
  Titles are compared without case, punctuation, or the abbreviations the page
  lists. The measure states the linking method and what it misses (people who
  change department or name), and that a changed label is not necessarily a
  promotion.
- A People link in the navigation, which now wraps on narrow screens.
- A budget page (`/budget`, "Budget" in the nav) with the E&G fund projection
  from the Board of Trustees meeting materials of June 1-2, 2026, retrieved
  2026-09-25, in `public/data/outlook.json`:
  - the run rate (annual gap) and ending fund balance for FY26-FY31, as a chart
    and a table: -$22,770,593 in FY27, growing to -$73,143,868 in FY31;
  - every published revenue and expense line, and the five alternative cases;
  - the $65 million reduction estimate beside the run rate's present value;
  - the FY27 all-funds budget, which shows that the deficit is in the E&G fund;
  - the stated assumptions and the budget actions UO has announced;
  - the unaudited FY26 actual reported since.

  Every figure is entered by hand as published and cited to its page. A test
  checks the packet's own arithmetic: lines sum to totals, revenue less expenses
  is the run rate, and balances roll forward. The sources page lists the
  documents cited.
