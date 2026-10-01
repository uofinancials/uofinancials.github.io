import type { FallRecord, FallYear } from '../../data/fall.ts'
import type { PersonBucket } from '../../data/person-bucket.ts'
import { NAME_BUCKETS, nameBucketOf } from './name-bucket.ts'
import { indexPeople } from './person-lookup.ts'

function publishedRecords(
  falls: FallYear[],
  published: FallYear[],
): Map<FallRecord, FallRecord> {
  return new Map(
    falls.flatMap(({ records }, census) =>
      records.map((record, index): [FallRecord, FallRecord] => {
        const original = published[census]?.records[index]
        if (original?.name !== record.name) {
          throw new Error(
            `The folded census ${census} does not line up with its published records at ${index}`,
          )
        }
        return [record, original]
      }),
    ),
  )
}

/** Every person filed under their shown name's bucket, each record as published, and every other name filed under its own; `published` is `falls` before folding, in the same order. */
export function buildPersonBuckets(
  falls: FallYear[],
  published: FallYear[],
): Map<string, PersonBucket> {
  const original = publishedRecords(falls, published)
  const buckets = new Map(
    NAME_BUCKETS.map((id): [string, PersonBucket] => [
      id,
      { people: [], joined: {} },
    ]),
  )
  for (const { name, otherNames, runs } of indexPeople(falls)) {
    buckets.get(nameBucketOf(name))?.people.push({
      name,
      ...(otherNames.length > 0 && { otherNames }),
      runs: runs.map(({ years }) =>
        years.map((year) => ({
          ...year,
          records: year.records.flatMap((record) => original.get(record) ?? []),
        })),
      ),
    })
    for (const other of otherNames) {
      const bucket = buckets.get(nameBucketOf(other))
      if (bucket) bucket.joined[other] = name
    }
  }
  return buckets
}
