import { existsSync, readdirSync } from 'node:fs'
import { expect, test } from 'vitest'
import { type FallRecord, fallYearSchema } from '../../src/data/fall.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import { personBucketSchema } from '../../src/data/person-bucket.ts'
import { foldUnitAliases } from '../../src/data/unit-aliases.ts'
import { NAME_BUCKETS, nameBucketOf } from '../../src/lib/people/name-bucket.ts'
import {
  personNameOf,
  personNamesOf,
} from '../../src/lib/people/person-names.ts'
import {
  fallDataPath,
  MANIFEST_PATH,
  PERSON_BUCKETS_DIR,
  personBucketPath,
  readJson,
} from '../scrape/cache.ts'

/** Parsing every census and every bucket takes a few seconds alone, more beside other test files. */
const ALL_RECORDS_TIMEOUT_MS = 30_000

function readBuckets() {
  return NAME_BUCKETS.map((id) => ({
    id,
    ...personBucketSchema.parse(readJson(personBucketPath(id))),
  }))
}

/** How many times each record's text occurs; two identical rows in one census count twice. */
function countRecords(records: FallRecord[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const record of records) {
    const text = JSON.stringify(record)
    counts.set(text, (counts.get(text) ?? 0) + 1)
  }
  return counts
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the name buckets hold every Fall record exactly once, as published, under the name its person is shown by',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const falls = manifest.fall.map(({ year }) => ({
      year,
      ...fallYearSchema.parse(readJson(fallDataPath(year))),
    }))
    const names = personNamesOf(falls.map(foldUnitAliases))
    const buckets = readBuckets()
    expect(readdirSync(PERSON_BUCKETS_DIR).sort()).toEqual(
      NAME_BUCKETS.map((id) => `${id}.json`),
    )
    const bucketRecords = new Map<number, FallRecord[]>()
    for (const { id, people } of buckets) {
      for (const person of people) {
        expect(nameBucketOf(person.name), person.name).toBe(id)
        for (const { year, censusDate, records } of person.runs.flat()) {
          expect(
            falls.find((fall) => fall.year === year)?.censusDate,
            person.name,
          ).toBe(censusDate)
          expect(
            records.every(
              (record) => personNameOf(names, record.name) === person.name,
            ),
            `${person.name} in Fall ${year}`,
          ).toBe(true)
          bucketRecords.set(year, [
            ...(bucketRecords.get(year) ?? []),
            ...records,
          ])
        }
      }
    }
    for (const { year, records } of falls) {
      expect(
        countRecords(bucketRecords.get(year) ?? []),
        `Fall ${year}`,
      ).toEqual(countRecords(records))
    }
  },
  ALL_RECORDS_TIMEOUT_MS,
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every other name is filed in its own bucket and points at the person who lists it, and none is missing',
  () => {
    const buckets = readBuckets()
    const people = new Map(
      buckets.flatMap((bucket) =>
        bucket.people.map((person) => [person.name, person]),
      ),
    )
    const pointers = buckets.flatMap(({ id, joined }) =>
      Object.entries(joined).map(([other, name]) => ({ id, other, name })),
    )
    for (const { id, other, name } of pointers) {
      expect(nameBucketOf(other), other).toBe(id)
      expect(people.get(name)?.otherNames, other).toContain(other)
      expect(people.has(other), other).toBe(false)
    }
    expect(pointers.map(({ other }) => other).sort()).toEqual(
      [...people.values()].flatMap((person) => person.otherNames ?? []).sort(),
    )
  },
  ALL_RECORDS_TIMEOUT_MS,
)
