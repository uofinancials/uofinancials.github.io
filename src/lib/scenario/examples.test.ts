import { expect, test } from 'vitest'
import { SCENARIO_EXAMPLES } from './examples'
import { parseRules, toSearchRules } from './search'

test('every example survives the URL form with no entry dropped', () => {
  for (const { rules } of SCENARIO_EXAMPLES) {
    expect(parseRules(toSearchRules(rules), new Set())).toEqual({
      rules,
      dropped: 0,
    })
  }
})
