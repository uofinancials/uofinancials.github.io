import { expect, test } from 'vitest'
import {
  payChangesSearchSchema,
  resolvePayChangesView,
} from './pay-changes-search'

test('a malformed or unlisted param falls back to its default', () => {
  const search = payChangesSearchSchema.parse({
    kind: 'staff',
    dept: 'abc',
    position: 'rank Professor',
    pair: 2030,
  })
  expect(resolvePayChangesView(search, [2023, 2024])).toEqual({
    kind: 'all',
    dept: null,
    position: 'rank Professor',
    pair: 2024,
  })
  expect(
    resolvePayChangesView(
      payChangesSearchSchema.parse({ dept: 222150, pair: 2023 }),
      [2023, 2024],
    ),
  ).toMatchObject({ dept: '222150', pair: 2023 })
})
