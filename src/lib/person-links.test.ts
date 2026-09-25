import { expect, test } from 'vitest'
import type { FallClassified, FallYear } from '@/data/fall'
import { classifiedJob } from '@/test/fall-records'
import { findPersonLinks } from './person-links'

function job(
  name: string,
  payCode: string,
  jobType: FallClassified['jobType'] = 'Primary',
): FallClassified {
  return classifiedJob({
    name,
    jobType,
    payDepartment: { code: payCode, name: `Dept ${payCode}` },
  })
}

function census(year: number, records: FallClassified[]): FallYear {
  return { censusDate: `${year}-11-01`, records }
}

test('links an identical name whose one primary job keeps its pay department', () => {
  const links = findPersonLinks([
    census(2021, [job('Doe, Ann', '111111')]),
    census(2020, [
      job('Doe, Ann', '111111'),
      job('Doe, Ann', '222222', 'Secondary'),
    ]),
  ])
  expect(links).toEqual([
    { name: 'Doe, Ann', fromYear: 2020, payDepartmentCode: '111111' },
  ])
})

test('does not link across a changed pay department', () => {
  expect(
    findPersonLinks([
      census(2020, [job('Doe, Ann', '111111')]),
      census(2021, [job('Doe, Ann', '222222')]),
    ]),
  ).toEqual([])
})

test('does not link a name with two primary jobs or none', () => {
  expect(
    findPersonLinks([
      census(2020, [
        job('Doe, Ann', '111111'),
        job('Doe, Ann', '111111'),
        job('Roe, Bo', '111111', 'Overload'),
      ]),
      census(2021, [job('Doe, Ann', '111111'), job('Roe, Bo', '111111')]),
    ]),
  ).toEqual([])
})

test('links only consecutive years and exact names', () => {
  const links = findPersonLinks([
    census(2020, [job('Doe, Ann', '111111'), job('Mcgee, Cy', '111111')]),
    census(2022, [job('Doe, Ann', '111111')]),
    census(2023, [job('Doe, Ann', '111111'), job('McGee, Cy', '111111')]),
  ])
  expect(links).toEqual([
    { name: 'Doe, Ann', fromYear: 2022, payDepartmentCode: '111111' },
  ])
})
