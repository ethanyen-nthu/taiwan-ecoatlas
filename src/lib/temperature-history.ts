/**
 * Pure helpers for the "Is Taiwan getting warmer?" page. The figures come
 * from src/data/temperature-history.json: one modelled series for the main
 * town of each county, built by scripts/build-temperature-history.mjs.
 * Nothing here reads the file, so tests can feed in small invented series.
 *
 * Rules kept throughout: a missing year stays null and is never drawn or
 * averaged as zero; an average is only given when every year it needs is
 * present; counties without a full record are left out of the island
 * average rather than filled in from their neighbours.
 */

export type Season = "annual" | "summer" | "winter";

export interface TempCounty {
  code: string;
  zh: string;
  en: string;
  /** The town whose coordinates were sent to the model. */
  town: string;
  townZh: string;
  lat: number;
  lon: number;
  /** The centre of the model grid cell the numbers describe. */
  gridLat: number;
  gridLon: number;
  /** The model's own elevation for that cell, in metres. */
  elevationM: number;
  annual: Record<string, number | null>;
  /** June to August. */
  summer: Record<string, number | null>;
  /** December of the year before, January and February. */
  winter: Record<string, number | null>;
  /** Days with no value in each year. */
  daysMissing: Record<string, number>;
}

export interface TempData {
  source: string;
  sourceUrl: string;
  model: string;
  variable: string;
  licence: string;
  fetchedAt: string;
  firstYear: number;
  lastYear: number;
  minDaysPerYear: number;
  counties: TempCounty[];
}

export interface YearValue {
  year: number;
  value: number | null;
}

export interface Period {
  from: number;
  to: number;
}

/** The first thirty years of the record and the latest thirty. */
export const baselinePeriod: Period = { from: 1950, to: 1979 };
export const recentPeriod: Period = { from: 1996, to: 2025 };
/** How many years the smoothed line averages. */
export const smoothingYears = 10;

/** The first year with a value for a season. A winter is named for the
 *  January it ends in, so the first one needs the December before it. */
export const firstYearOf = (data: TempData, season: Season) =>
  season === "winter" ? data.firstYear + 1 : data.firstYear;

export function seriesOf(county: TempCounty, data: TempData, season: Season) {
  const out: YearValue[] = [];
  for (let year = firstYearOf(data, season); year <= data.lastYear; year += 1) {
    out.push({ year, value: county[season][String(year)] ?? null });
  }
  return out;
}

/** True when the county has a value for every year of the season's series. */
export const hasFullRecord = (
  county: TempCounty,
  data: TempData,
  season: Season = "annual",
) => seriesOf(county, data, season).every((point) => point.value !== null);

export const fullRecordCounties = (data: TempData, season: Season = "annual") =>
  data.counties.filter((county) => hasFullRecord(county, data, season));

/** The plain mean of every county that has a full record, year by year.
 *  Each county counts once, whatever its size, so this is an average of
 *  places and not an area-weighted figure for the island. */
export function islandSeries(data: TempData, season: Season): YearValue[] {
  const counties = fullRecordCounties(data, season);
  const first = firstYearOf(data, season);
  const out: YearValue[] = [];
  for (let year = first; year <= data.lastYear; year += 1) {
    out.push({
      year,
      value:
        counties.length === 0
          ? null
          : counties.reduce(
              (sum, county) => sum + (county[season][String(year)] as number),
              0,
            ) / counties.length,
    });
  }
  return out;
}

/** The mean of the years from..to, or null if any of them has no value. */
export function meanOver(points: YearValue[], from: number, to: number) {
  const inside = points.filter(
    (point) => point.year >= from && point.year <= to,
  );
  if (
    inside.length !== to - from + 1 ||
    inside.some((point) => point.value === null)
  ) {
    return null;
  }
  return (
    inside.reduce((sum, point) => sum + (point.value as number), 0) /
    inside.length
  );
}

/** The average of each year and the ones before it. A year gets a value only
 *  when all `window` years behind it have one. */
export function trailingMean(
  points: YearValue[],
  window = smoothingYears,
): YearValue[] {
  return points.map((point, index) => {
    if (index < window - 1) return { year: point.year, value: null };
    const slice = points.slice(index - window + 1, index + 1);
    const complete =
      slice[0].year === point.year - window + 1 &&
      slice.every((item) => item.value !== null);
    return {
      year: point.year,
      value: complete
        ? slice.reduce((sum, item) => sum + (item.value as number), 0) / window
        : null,
    };
  });
}

/** How far each year sits above or below the mean of a base period. All
 *  null if the base period is not complete. */
export function anomalies(
  points: YearValue[],
  base: Period = baselinePeriod,
): YearValue[] {
  const reference = meanOver(points, base.from, base.to);
  return points.map((point) => ({
    year: point.year,
    value:
      reference === null || point.value === null
        ? null
        : point.value - reference,
  }));
}

/** Change between two periods: later mean minus earlier mean. */
export function periodChange(
  points: YearValue[],
  early: Period = baselinePeriod,
  late: Period = recentPeriod,
) {
  const before = meanOver(points, early.from, early.to);
  const after = meanOver(points, late.from, late.to);
  if (before === null || after === null) return null;
  return { before, after, change: after - before };
}

/** A straight line through the years that have values, in degrees per
 *  decade. Needs at least ten points; fewer would say little. */
export function trendPerDecade(points: YearValue[]) {
  const known = points.filter(
    (point): point is { year: number; value: number } => point.value !== null,
  );
  if (known.length < 10) return null;
  const meanX =
    known.reduce((sum, point) => sum + point.year, 0) / known.length;
  const meanY =
    known.reduce((sum, point) => sum + point.value, 0) / known.length;
  let top = 0;
  let bottom = 0;
  for (const point of known) {
    top += (point.year - meanX) * (point.value - meanY);
    bottom += (point.year - meanX) ** 2;
  }
  return (top / bottom) * 10;
}

/** The n highest years, highest first; a tie goes to the later year. */
export function warmestYears(points: YearValue[], count: number) {
  return points
    .filter(
      (point): point is { year: number; value: number } => point.value !== null,
    )
    .sort((a, b) => b.value - a.value || b.year - a.year)
    .slice(0, count);
}

export interface CountyChange {
  county: TempCounty;
  /** Null when the model has no full record for this county. */
  result: ReturnType<typeof periodChange>;
}

/** Every county with its change between the two periods, biggest rise
 *  first; counties without a full record come last, in file order. */
export function countyChanges(data: TempData): CountyChange[] {
  const rows = data.counties.map((county) => ({
    county,
    result: hasFullRecord(county, data)
      ? periodChange(seriesOf(county, data, "annual"))
      : null,
  }));
  const withData = rows
    .filter((row) => row.result !== null)
    .sort(
      (a, b) =>
        (b.result as { change: number }).change -
          (a.result as { change: number }).change ||
        a.county.code.localeCompare(b.county.code),
    );
  return [...withData, ...rows.filter((row) => row.result === null)];
}

/** One decimal place with a real minus sign, for the figures on the page. */
export function degrees(value: number, signed = false) {
  const text = Math.abs(value).toFixed(1);
  const zero = Number(text) === 0;
  if (zero) return text;
  if (value < 0) return `−${text}`;
  return signed ? `+${text}` : text;
}
