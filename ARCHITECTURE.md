# UO Financials Architecture

## Overview

UO Financials is a static single-page site built with Vite and React. GitHub
Pages serves it from the `uofinancials.github.io` repository.

## Systems

### Site (`src/`)

- `src/main.tsx` - mounts the app.
- `src/app.tsx` - the page shell.
- `src/components/ui` - shadcn/ui components.
- `src/lib` - shared helpers.

### End-to-end tests (`e2e/`)

- `e2e/home.spec.ts` - loads the built home page.

## Deployment

- `.github/workflows/ci.yml` - on every push and pull request, runs the checks,
  unit tests, and end-to-end tests; on `main`, publishes `dist/` to Pages.
