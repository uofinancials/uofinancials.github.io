import { expect, test } from 'vitest'
import { personBucketSchema } from '@/data/person-bucket'
import { foldUnitAliases } from '@/data/unit-aliases'
import { census, classifiedJob } from '@/test/fall-records'
import { NAME_BUCKETS, nameBucketOf } from './name-bucket'
import { buildPersonBuckets } from './person-buckets'

const ALIAS_CODE = '223131'
const UNIT_CODE = '223100'
const published = [
  census(2020, [
    classifiedJob({
      name: 'Doe, Ann B',
      payDepartment: { code: ALIAS_CODE, name: 'CAS Bio' },
    }),
    classifiedJob({ name: 'Smith, John' }),
  ]),
  census(2021, [
    classifiedJob({
      name: 'Roe, Ann B',
      payDepartment: { code: UNIT_CODE, name: 'CAS Bio' },
    }),
  ]),
]
const buckets = buildPersonBuckets(published.map(foldUnitAliases), published)
const bucketOf = (name: string) => buckets.get(nameBucketOf(name))

test('every bucket is built, and each matches the schema', () => {
  expect([...buckets.keys()]).toEqual(NAME_BUCKETS)
  for (const bucket of buckets.values()) {
    expect(personBucketSchema.parse(bucket)).toEqual(bucket)
  }
  expect(
    [...buckets.values()].flatMap(({ people }) =>
      people.map(({ name }) => name),
    ),
  ).toHaveLength(2)
})

test('a person is filed under their shown name with each record as published, and their other name points to them from its own bucket', () => {
  const ann = bucketOf('Roe, Ann B')?.people.find(
    ({ name }) => name === 'Roe, Ann B',
  )
  expect(ann?.otherNames).toEqual(['Doe, Ann B'])
  expect(
    ann?.runs.map((run) =>
      run.map(({ year, censusDate }) => [year, censusDate]),
    ),
  ).toEqual([
    [
      [2020, '2020-11-01'],
      [2021, '2021-11-01'],
    ],
  ])
  expect(ann?.runs[0]?.[0]?.records).toEqual([published[0]?.records[0]])
  expect(ann?.runs[0]?.[0]?.records[0]?.payDepartment).toEqual({
    code: ALIAS_CODE,
    name: 'CAS Bio',
  })
  expect(bucketOf('Doe, Ann B')?.joined).toEqual({ 'Doe, Ann B': 'Roe, Ann B' })
})

test('a person with one name has no other names and no pointer', () => {
  const john = bucketOf('Smith, John')?.people.find(
    ({ name }) => name === 'Smith, John',
  )
  expect(john && 'otherNames' in john).toBe(false)
  expect(
    [...buckets.values()].flatMap(({ joined }) => Object.keys(joined)),
  ).toEqual(['Doe, Ann B'])
})
