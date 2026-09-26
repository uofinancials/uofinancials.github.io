import { expect, test } from 'vitest'
import { SCENARIO_EXAMPLES } from './scenario-examples'
import { parseRules, toSearchRules } from './scenario-search'

test('every example survives the URL form with no entry dropped', () => {
  for (const { rules } of SCENARIO_EXAMPLES) {
    expect(parseRules(toSearchRules(rules))).toEqual({ rules, dropped: 0 })
  }
})
