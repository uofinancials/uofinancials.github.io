import { expect, test } from 'vitest'
import {
  canMoveRule,
  newRule,
  RULE_KINDS,
  ruleInsertIndex,
  sortByStage,
  swapAt,
} from './scenario-edit'
import { parseRules, toSearchRules } from './scenario-search'

test('each new rule is one the URL form can hold', () => {
  const rules = sortByStage(RULE_KINDS.map((kind) => newRule(kind, '222000')))
  expect(parseRules(toSearchRules(rules), new Set(['222000']))).toEqual({
    rules,
    dropped: 0,
  })
})

test('a rule moves one place, and not past either end', () => {
  const [a, b, c] = (['threshold', 'remove', 'cut'] as const).map((kind) =>
    newRule(kind, '222000'),
  )
  if (!a || !b || !c) throw new Error('Three rules')
  expect(canMoveRule([a, b, c], 0, 1)).toBe(true)
  expect(canMoveRule([a, b, c], 2, -1)).toBe(true)
  expect(canMoveRule([a, b, c], 0, -1)).toBe(false)
  expect(canMoveRule([a, b, c], 2, 1)).toBe(false)
  expect(swapAt([a, b, c], 0, 1)).toEqual([b, a, c])
  expect(swapAt([a, b, c], 2, -1)).toEqual([a, c, b])
  expect(swapAt([a, b, c], 2, 1)).toEqual([a, b, c])
})

test('rules sort into stage order, keeping their order within a stage', () => {
  const [threshold, remove, cut, freeze, raises, eliminate] = RULE_KINDS.map(
    (kind) => newRule(kind, '222000'),
  )
  if (!threshold || !remove || !cut || !freeze || !raises || !eliminate)
    throw new Error('Six rules')
  expect(
    sortByStage([raises, cut, freeze, threshold, eliminate, remove]),
  ).toEqual([eliminate, cut, threshold, remove, freeze, raises])
})

test('a rule does not move past the edge of its stage', () => {
  const [threshold, freeze] = (['threshold', 'freeze'] as const).map((kind) =>
    newRule(kind, '222000'),
  )
  if (!threshold || !freeze) throw new Error('Two rules')
  expect(canMoveRule([threshold, freeze], 0, 1)).toBe(false)
  expect(canMoveRule([threshold, freeze], 1, -1)).toBe(false)
})

test('a new rule goes at the end of its stage', () => {
  const rules = sortByStage(RULE_KINDS.map((kind) => newRule(kind, '222000')))
  expect(ruleInsertIndex(rules, newRule('eliminate', '222000'))).toBe(1)
  expect(ruleInsertIndex(rules, newRule('cut', '222000'))).toBe(4)
  expect(ruleInsertIndex(rules, newRule('raises', '222000'))).toBe(6)
  expect(ruleInsertIndex([], newRule('freeze', '222000'))).toBe(0)
})

test('a link that interleaves stages loads in stage order', () => {
  const freeze = newRule('freeze', '222000')
  const threshold = newRule('threshold', '222000')
  expect(
    parseRules(toSearchRules([freeze, threshold]), new Set()).rules,
  ).toEqual([threshold, freeze])
})
