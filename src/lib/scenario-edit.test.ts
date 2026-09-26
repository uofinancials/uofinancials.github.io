import { expect, test } from 'vitest'
import { moveRule, newRule, RULE_KINDS, sortByStage } from './scenario-edit'
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
  expect(moveRule([a, b, c], 0, 1)).toEqual([b, a, c])
  expect(moveRule([a, b, c], 2, -1)).toEqual([a, c, b])
  expect(moveRule([a, b, c], 0, -1)).toEqual([a, b, c])
  expect(moveRule([a, b, c], 2, 1)).toEqual([a, b, c])
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
  expect(moveRule([threshold, freeze], 0, 1)).toEqual([threshold, freeze])
  expect(moveRule([threshold, freeze], 1, -1)).toEqual([threshold, freeze])
})

test('a link that interleaves stages loads in stage order', () => {
  const freeze = newRule('freeze', '222000')
  const threshold = newRule('threshold', '222000')
  expect(
    parseRules(toSearchRules([freeze, threshold]), new Set()).rules,
  ).toEqual([threshold, freeze])
})
