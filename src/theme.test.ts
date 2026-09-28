import { describe, expect, it } from 'vitest'
import { LINE_COLORS } from '@/components/charts/line-color'
import CSS from './index.css?raw'

type Oklab = { lightness: number; a: number; b: number }
type Tokens = Map<string, Oklab>

const DARK_MARKER = '@media (prefers-color-scheme: dark) {'
const OKLCH_TOKEN = /--([\w-]+):\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/g

const TEXT_CONTRAST = 4.5
const GRAPHIC_CONTRAST = 3
const TEXT_TOKENS = ['foreground', 'muted-foreground', 'primary']
const TEXT_SURFACES = ['background', 'card', 'muted']
const GRAPHIC_TOKENS = [
  'ring',
  'chart',
  ...Array.from({ length: LINE_COLORS }, (_, index) => `line-${index + 1}`),
]
const UO_COLORS = { green: '#154733', yellow: '#fee123' }
const MIN_UO_DISTANCE = 0.15
const MIN_CHROMA = 0.03

function parseTokens(block: string): Tokens {
  const tokens: Tokens = new Map()
  for (const [, name, lightness, chroma, hue] of block.matchAll(OKLCH_TOKEN)) {
    const radians = (Number(hue) * Math.PI) / 180
    tokens.set(name ?? '', {
      lightness: Number(lightness),
      a: Number(chroma) * Math.cos(radians),
      b: Number(chroma) * Math.sin(radians),
    })
  }
  return tokens
}

const [lightBlock = '', darkBlock = ''] = CSS.split(DARK_MARKER)
const LIGHT = parseTokens(lightBlock)
const THEMES = {
  light: LIGHT,
  dark: new Map([...LIGHT, ...parseTokens(darkBlock)]),
}

function relativeLuminance({ lightness, a, b }: Oklab): number {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (channel: number) => Math.min(1, Math.max(0, channel))
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(first: Oklab, second: Oklab): number {
  const [one, other] = [relativeLuminance(first), relativeLuminance(second)]
  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05)
}

function hexToOklab(hex: string): Oklab {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  )
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  )
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  )
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

function token(tokens: Tokens, name: string): Oklab {
  const value = tokens.get(name)
  if (!value) throw new Error(`index.css defines no oklch token --${name}`)
  return value
}

describe.each(Object.entries(THEMES))('the %s theme', (_, tokens) => {
  it.each(
    TEXT_TOKENS.flatMap((text) =>
      TEXT_SURFACES.map((surface) => [text, surface]),
    ),
  )('sets --%s on --%s at AA text contrast', (text, surface) => {
    expect(
      contrast(token(tokens, text), token(tokens, surface)),
    ).toBeGreaterThanOrEqual(TEXT_CONTRAST)
  })

  it.each(GRAPHIC_TOKENS)('sets --%s on --background at 3:1', (name) => {
    expect(
      contrast(token(tokens, name), token(tokens, 'background')),
    ).toBeGreaterThanOrEqual(GRAPHIC_CONTRAST)
  })

  it.each(Object.entries(UO_COLORS))(
    'keeps every chromatic token clear of UO %s',
    (_, hex) => {
      const brand = hexToOklab(hex)
      for (const [name, value] of tokens) {
        if (Math.hypot(value.a, value.b) < MIN_CHROMA) continue
        const distance = Math.hypot(
          value.lightness - brand.lightness,
          value.a - brand.a,
          value.b - brand.b,
        )
        expect(distance, `--${name}`).toBeGreaterThanOrEqual(MIN_UO_DISTANCE)
      }
    },
  )
})
