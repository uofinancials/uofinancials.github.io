import { expect, test } from 'vitest'
import { census, classifiedJob } from '@/test/fall-records'
import {
  NAME_BUCKETS,
  nameBucketOf,
  personIn,
  shownNameIn,
} from './name-bucket'

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

const year = (of: number) => ({ year: of, ...census(of, [classifiedJob()]) })
const BUCKET = {
  people: [
    {
      name: 'Doe, Ann',
      otherNames: ['Roe, Ann'],
      runs: [[year(2014), year(2015)], [year(2017)]],
    },
    { name: 'Poe, Bo', runs: [[year(2020)]] },
  ],
  joined: { 'Moe, Cy': 'Lee, Cy' },
}

test('a person is read from the bucket under their shown name, a run of several years being linked', () => {
  expect(personIn(BUCKET, 'Doe, Ann')).toEqual({
    name: 'Doe, Ann',
    otherNames: ['Roe, Ann'],
    runs: [
      { years: [year(2014), year(2015)], isLinked: true },
      { years: [year(2017)], isLinked: false },
    ],
  })
  expect(personIn(BUCKET, 'Poe, Bo')?.otherNames).toEqual([])
  expect(personIn(BUCKET, 'Moe, Cy')).toBeNull()
})

test('another name leads to the name its person is shown under, and no other key does', () => {
  expect(shownNameIn(BUCKET, 'Moe, Cy')).toBe('Lee, Cy')
  expect(shownNameIn(BUCKET, 'Doe, Ann')).toBeNull()
  expect(shownNameIn(BUCKET, 'constructor')).toBeNull()
})
