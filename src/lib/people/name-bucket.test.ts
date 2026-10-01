import { expect, test } from 'vitest'
import { NAME_BUCKETS, nameBucketOf } from './name-bucket'

test('a name’s bucket is the low byte of its FNV-1a hash, pinned because the data files are named by it', () => {
  expect(
    ['', 'a', 'foobar', 'Doe, Ann', 'Doe, Ann B', 'O’Neil-Smith, José Á'].map(
      nameBucketOf,
    ),
  ).toEqual(['c5', '2c', '68', '6e', '18', 'c7'])
})

test('there are 256 buckets, 00 to ff', () => {
  expect(NAME_BUCKETS).toHaveLength(256)
  expect([NAME_BUCKETS[0], NAME_BUCKETS.at(-1)]).toEqual(['00', 'ff'])
  expect(new Set(NAME_BUCKETS).size).toBe(256)
})
