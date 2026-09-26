import { expect, test } from 'vitest'
import { moveRule, newRule, RULE_KINDS } from './scenario-edit'
import { parseRules, toSearchRules } from './scenario-search'

test('each new rule is one the URL form can hold', () => {
  const rules = RULE_KINDS.map((kind) => newRule(kind, '222000'))
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
