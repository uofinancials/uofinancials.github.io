import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { sliceTrends } from './summary'
import { buildTrends, type TrendFilter } from './trends'

const CENSUSES = [
  {
    year: 2016,
    records: [
      unclassifiedJob({ eeoCategory: null }),
      unclassifiedJob(),
      classifiedJob(),
    ],
  },
  { year: 2017, records: [unclassifiedJob(), unclassifiedJob()] },
  { year: 2018, records: [classifiedJob(), unclassifiedJob()] },
]

const FULL: TrendFilter = {
  kind: 'all',
  group: null,
  dept: null,
  position: null,
  jobs: null,
  from: 2016,
  to: 2018,
}

test('every range sliced from the full trends is the range built directly, lines without jobs dropped', () => {
  for (const group of [null, 'Faculty'] as const) {
    const full = buildTrends(CENSUSES, { ...FULL, group })
    for (const from of [2016, 2017, 2018]) {
      for (const to of [2016, 2017, 2018].filter((year) => year >= from)) {
        expect(sliceTrends(full, from, to)).toEqual(
          buildTrends(CENSUSES, { ...FULL, group, from, to }),
        )
      }
    }
  }
  const full = buildTrends(CENSUSES, FULL)
  expect(sliceTrends(full, 2017, 2017).series.length).toBeLessThan(
    full.series.length,
  )
})
