import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { peerKeyFor } from './peer-group'

const YEARS = [
  {
    records: [
      classifiedJob(),
      unclassifiedJob({ rank: 'Professor' }),
      unclassifiedJob({ rank: 'No Rank', oaSalaryGrade: 'OA05' }),
      unclassifiedJob({ rank: 'No Rank', oaSalaryGrade: 'OA06' }),
    ],
  },
]

test('a published class code or rank is read as its jobs’ peer group, and a key is kept', () => {
  expect(peerKeyFor(YEARS, 'E0104')).toBe('class 0104')
  expect(peerKeyFor(YEARS, 'Professor')).toBe('rank Professor')
  expect(peerKeyFor(YEARS, 'class 0104')).toBe('class 0104')
})

test('a value whose jobs span several groups, or none, is left as given', () => {
  expect(peerKeyFor(YEARS, 'No Rank')).toBe('No Rank')
  expect(peerKeyFor(YEARS, 'Z9999')).toBe('Z9999')
})
