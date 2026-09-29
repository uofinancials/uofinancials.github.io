import type { FallYear } from '../../src/data/fall.ts'
import {
  findNamePairs,
  isLinkedByRule,
  type NamePair,
} from '../../src/lib/people/name-pairs.ts'

/** Every name pair left for hand review: those no rule links. */
export function findPersonCandidates(falls: FallYear[]): NamePair[] {
  return findNamePairs(falls).filter((pair) => !isLinkedByRule(pair))
}
