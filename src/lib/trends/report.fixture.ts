import type { TrendPoint, Trends } from './trends'

export function point(
  year: number,
  jobs: number,
  spendCents: number | null,
  fteHundredths: number,
  medianRateCents: number | null,
): TrendPoint {
  return { year, jobs, spendCents, fteHundredths, medianRateCents }
}

export const TRENDS: Trends = {
  series: [
    {
      key: 'Faculty',
      points: [
        point(2014, 10, 1000, 1000, 100),
        point(2015, 10, 1500, 1000, 120),
      ],
    },
    {
      key: 'Executives',
      points: [
        point(2014, 1, null, 100, null),
        point(2015, 2, null, 200, null),
      ],
    },
    {
      key: 'Admins and professionals',
      points: [point(2014, 4, 400, 400, 90), point(2015, 6, 900, 600, 100)],
    },
    {
      key: 'Classified temporaries',
      points: [
        point(2014, 5, null, 250, null),
        point(2015, 5, null, 250, null),
      ],
    },
  ],
  total: [point(2014, 20, 1500, 1750, 95), point(2015, 23, 2600, 2050, 110)],
}
