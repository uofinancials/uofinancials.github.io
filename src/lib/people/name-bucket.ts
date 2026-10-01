const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193
const BUCKET_COUNT = 256
const HEX = 16
const ID_LENGTH = 2

function bucketId(index: number): string {
  return index.toString(HEX).padStart(ID_LENGTH, '0')
}

/** Every bucket file's id: two hex digits. */
export const NAME_BUCKETS = Array.from({ length: BUCKET_COUNT }, (_, index) =>
  bucketId(index),
)

/** The bucket a published name is filed in: its 32-bit FNV-1a hash over UTF-16 code units, modulo the bucket count. The data files are named by it, so a change here must come with re-derived files. */
export function nameBucketOf(name: string): string {
  let hash = FNV_OFFSET
  for (let index = 0; index < name.length; index++) {
    hash = Math.imul(hash ^ name.charCodeAt(index), FNV_PRIME)
  }
  return bucketId((hash >>> 0) % BUCKET_COUNT)
}
