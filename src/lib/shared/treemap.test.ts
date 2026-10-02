import { expect, test } from 'vitest'
import { type Rect, treemapFractions, treemapLayout } from './treemap'

const PLACES = 6
const rounded = (rects: Rect[]) =>
  rects.map(({ x, y, width, height }) =>
    [x, y, width, height].map((side) => Number(side.toFixed(PLACES))),
  )

test('one value fills the box, and two equal values halve its long side', () => {
  expect(treemapLayout([5], { width: 4, height: 2 })).toEqual([
    { x: 0, y: 0, width: 4, height: 2 },
  ])
  expect(treemapLayout([1, 1], { width: 4, height: 2 })).toEqual([
    { x: 0, y: 0, width: 2, height: 2 },
    { x: 2, y: 0, width: 2, height: 2 },
  ])
  expect(treemapLayout([1, 1], { width: 2, height: 4 })).toEqual([
    { x: 0, y: 0, width: 2, height: 2 },
    { x: 0, y: 2, width: 2, height: 2 },
  ])
  expect(treemapLayout([], { width: 4, height: 2 })).toEqual([])
})

// The worked example of Bruls, Huizing and van Wijk, "Squarified Treemaps": the two 6s stack in a
// column 3 wide, 4 and 3 share a strip 7/3 tall, and 2, 2 and 1 fill the 3 by 5/3 box left under it.
test('values are laid in rows along the shorter side, each row closed when another value would make it less square', () => {
  expect(
    rounded(treemapLayout([6, 6, 4, 3, 2, 2, 1], { width: 6, height: 4 })),
  ).toEqual(
    rounded([
      { x: 0, y: 0, width: 3, height: 2 },
      { x: 0, y: 2, width: 3, height: 2 },
      { x: 3, y: 0, width: 12 / 7, height: 7 / 3 },
      { x: 3 + 12 / 7, y: 0, width: 9 / 7, height: 7 / 3 },
      { x: 3, y: 7 / 3, width: 1.2, height: 5 / 3 },
      { x: 4.2, y: 7 / 3, width: 1.2, height: 5 / 3 },
      { x: 5.4, y: 7 / 3, width: 0.6, height: 5 / 3 },
    ]),
  )
})

test('in a box of any shape each rectangle’s area is its value’s share, and the shape changes the rows', () => {
  const values = [6, 6, 4, 3, 2, 2, 1]
  const landscape = treemapLayout(values, { width: 12, height: 5 })
  const portrait = treemapLayout(values, { width: 5, height: 12 })
  for (const rects of [landscape, portrait]) {
    // The box's area is 60 and the values sum to 24, so a value of 6 covers 15.
    expect(
      rects.map(({ width, height }) =>
        Number((width * height).toFixed(PLACES)),
      ),
    ).toEqual([15, 15, 10, 7.5, 5, 5, 2.5])
  }
  // A 6 alone on the short side is 3 by 5, nearer square than two sharing it at 6 by 2.5, so each takes
  // the whole side: a column in the wide box, a strip in the tall one.
  expect(rounded(landscape.slice(0, 2))).toEqual([
    [0, 0, 3, 5],
    [3, 0, 3, 5],
  ])
  expect(rounded(portrait.slice(0, 2))).toEqual([
    [0, 0, 5, 3],
    [0, 3, 5, 3],
  ])
})

test('fractions give each rectangle as a share of the box’s width and height', () => {
  // In a 12 by 5 box, 3 and 1 are a column 9 wide and one 3 wide.
  expect(treemapFractions([3, 1], { width: 12, height: 5 })).toEqual([
    { x: 0, y: 0, width: 0.75, height: 1 },
    { x: 0.75, y: 0, width: 0.25, height: 1 },
  ])
})
