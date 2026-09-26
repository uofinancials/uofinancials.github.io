import { ANY_SCOPE, type Rule } from './scenario.ts'

export type ScenarioExample = { question: string; rules: Rule[] }

/** Reader questions the page answers, each with the rules that answer it. */
export const SCENARIO_EXAMPLES: ScenarioExample[] = [
  {
    question: 'What would 10% off pay above $200,000 save?',
    rules: [
      {
        kind: 'threshold',
        scope: ANY_SCOPE,
        overCents: 20_000_000,
        cutBasisPoints: 1_000,
      },
    ],
  },
  {
    question:
      'What would a $250,000 cap on salary rates save, and how many jobs would it reach?',
    rules: [
      {
        kind: 'threshold',
        scope: ANY_SCOPE,
        overCents: 25_000_000,
        cutBasisPoints: 10_000,
      },
    ],
  },
  {
    question: 'What does 10% off executive pay save, and then 2% off all pay?',
    rules: [
      {
        kind: 'cut',
        scope: { ...ANY_SCOPE, group: 'Executives' },
        cutBasisPoints: 1_000,
      },
      { kind: 'cut', scope: ANY_SCOPE, cutBasisPoints: 200 },
    ],
  },
  {
    question:
      'What would a one-year hiring freeze on classified jobs save, and how many positions would stay empty?',
    rules: [
      {
        kind: 'freeze',
        scope: { ...ANY_SCOPE, kind: 'classified' },
        years: 1,
        afterFreeze: 'refill',
      },
    ],
  },
  {
    question: 'What would a one-year raise freeze save?',
    rules: [{ kind: 'raises', scope: ANY_SCOPE, years: 1, capBasisPoints: 0 }],
  },
  {
    question:
      'With a one-year hiring freeze and 5% off pay above $150,000, what gap is left each year to FY31?',
    rules: [
      { kind: 'freeze', scope: ANY_SCOPE, years: 1, afterFreeze: 'refill' },
      {
        kind: 'threshold',
        scope: ANY_SCOPE,
        overCents: 15_000_000,
        cutBasisPoints: 500,
      },
    ],
  },
]
