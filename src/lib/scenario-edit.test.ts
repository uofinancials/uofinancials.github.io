import { expect, test } from 'vitest'
import { moveRule, newRule, RULE_KINDS } from './scenario-edit'
import { parseRules, toSearchRules } from './scenario-search'

test('each new rule is one the URL form can hold', () => {
  const rules = RULE_KINDS.map(newRule)
  expect(parseRules(toSearchRules(rules), new Set())).toEqual({
    rules,
    dropped: 0,
  })
})

test('a rule moves one place, and not past either end', () => {
  const [a, b, c] = [newRule('threshold'), newRule('remove'), newRule('cut')]
  expect(moveRule([a, b, c], 0, 1)).toEqual([b, a, c])
  expect(moveRule([a, b, c], 2, -1)).toEqual([a, c, b])
  expect(moveRule([a, b, c], 0, -1)).toEqual([a, b, c])
  expect(moveRule([a, b, c], 2, 1)).toEqual([a, b, c])
})
