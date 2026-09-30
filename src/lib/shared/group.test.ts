import { expect, test } from 'vitest'
import { groupBy } from './group'

test('groups items under their keys, keys and members in order of first appearance', () => {
  const groups = groupBy(['bb', 'a', 'cc', 'd', 'eee'], (word) => word.length)
  expect([...groups]).toEqual([
    [2, ['bb', 'cc']],
    [1, ['a', 'd']],
    [3, ['eee']],
  ])
})

test('keeps a null key as its own group', () => {
  const groups = groupBy([1, 2, 3], (n) => (n === 2 ? null : 'odd'))
  expect([...groups]).toEqual([
    ['odd', [1, 3]],
    [null, [2]],
  ])
})

test('an empty input has no groups', () => {
  expect(groupBy([], String).size).toBe(0)
})
