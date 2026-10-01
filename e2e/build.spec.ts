import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const FY_DIR = 'data/fy'

test('the build serves the app as 404.html for clean paths on Pages', () => {
  expect(readFileSync('dist/404.html', 'utf8')).toBe(
    readFileSync('dist/index.html', 'utf8'),
  )
})

test('the build holds no fiscal year’s job file', () => {
  const files = readdirSync(`public/${FY_DIR}`)
  expect(files).not.toEqual([])
  expect(files.filter((file) => existsSync(`dist/${FY_DIR}/${file}`))).toEqual(
    [],
  )
})
