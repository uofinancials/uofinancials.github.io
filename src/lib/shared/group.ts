/** The items under each key, keys and members in order of first appearance. */
export function groupBy<T, K>(
  items: Iterable<T>,
  keyOf: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const members = groups.get(key)
    if (members) members.push(item)
    else groups.set(key, [item])
  }
  return groups
}
