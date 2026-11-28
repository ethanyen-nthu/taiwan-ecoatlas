/**
 * What the temperature map needs, worked out from the temperature file: for
 * each season, every county's change from its own base-period average, year by
 * year, plus decade averages for the then-and-now view. A county without a
 * full record has nothing here (all null), so it is drawn as "no data".
 */
import type { MapScale } from "./county-shapes";
import {
  anomalies,
  baselinePeriod,
  firstYearOf,
  hasFullRecord,
  islandSeries,
  seriesOf,
  type Period,
  type Season,
  type TempData,
} from "./temperature-history";
import { periodMean, yearRuns } from "./year-map";

/** Blue below the base period's average, sand and orange above it, darker as
 *  the gap grows. Lightness changes along the ramp, so it reads without hue. */
const colors = [
  "#2c5c8f",
  "#6f9cc7",
  "#b9d2e8",
  "#f7e7cf",
  "#f1c791",
  "#e59a5e",
  "#c9622f",
  "#8e3315",
];
/** Whole years sit within about −1 to +2.4 °C; single winters swing twice as
 *  far, so winter's classes are twice as wide. */
export const warmingScales: Record<Season, MapScale> = {
  annual: { breaks: [-1, -0.5, 0, 0.5, 1, 1.5, 2], colors },
  summer: { breaks: [-1, -0.5, 0, 0.5, 1, 1.5, 2], colors },
  winter: { breaks: [-2, -1, 0, 1, 2, 3, 4], colors },
};

/** A winter is named for its January, so its first year needs the December
 *  before it and its base period starts a year later. */
export const baseFor = (season: Season): Period =>
  season === "winter"
    ? { from: baselinePeriod.from + 1, to: baselinePeriod.to }
    : baselinePeriod;

export interface TempMapSeason {
  season: Season;
  years: number[];
  base: Period;
  /** County code to its change from its own base-period average. */
  anomaly: Record<string, (number | null)[]>;
  /** County code to the modelled temperature itself. */
  actual: Record<string, (number | null)[]>;
  /** The change in the plain average of the counties with a full record. */
  island: (number | null)[];
  /** How many counties went into the island figure. */
  counted: number;
  decades: {
    id: string;
    from: number;
    to: number;
    values: Record<string, number | null>;
  }[];
}

export function temperatureMapData(
  data: TempData,
  season: Season,
): TempMapSeason {
  const base = baseFor(season);
  const first = firstYearOf(data, season);
  const years = Array.from(
    { length: data.lastYear - first + 1 },
    (_, index) => first + index,
  );
  const anomaly: Record<string, (number | null)[]> = {};
  const actual: Record<string, (number | null)[]> = {};
  for (const county of data.counties) {
    const series = seriesOf(county, data, season);
    actual[county.code] = series.map((point) => point.value);
    anomaly[county.code] = hasFullRecord(county, data, season)
      ? anomalies(series, base).map((point) => point.value)
      : years.map(() => null);
  }
  const island = anomalies(islandSeries(data, season), base).map(
    (point) => point.value,
  );
  const counted = data.counties.filter((county) =>
    hasFullRecord(county, data, season),
  ).length;
  const decades = yearRuns(first, data.lastYear, 10).map(({ from, to }) => ({
    id: `${from}-${to}`,
    from,
    to,
    values: Object.fromEntries(
      data.counties.map((county) => [
        county.code,
        periodMean(years, anomaly[county.code], from, to),
      ]),
    ),
  }));
  return { season, years, base, anomaly, actual, island, counted, decades };
}
