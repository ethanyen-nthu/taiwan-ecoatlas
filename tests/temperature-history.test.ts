import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { reduce, towns } from "../scripts/build-temperature-history.mjs";
import { temperatureSources } from "@/content/temperature-sources";
import { temperatureHistory } from "@/data/temperature";
import {
  anomalies,
  countyChanges,
  degrees,
  fullRecordCounties,
  hasFullRecord,
  islandSeries,
  meanOver,
  periodChange,
  seriesOf,
  trailingMean,
  trendPerDecade,
  warmestYears,
  type TempCounty,
  type TempData,
  type YearValue,
} from "@/lib/temperature-history";

const line = (
  from: number,
  to: number,
  value: (year: number) => number | null,
) =>
  Array.from({ length: to - from + 1 }, (_, index) => ({
    year: from + index,
    value: value(from + index),
  })) as YearValue[];

/** A county whose annual, summer and winter series come from a function. */
function county(
  code: string,
  annual: (year: number) => number | null,
  first = 1950,
  last = 1959,
): TempCounty {
  const table = (fn: (year: number) => number | null, from: number) =>
    Object.fromEntries(
      line(from, last, fn).map((point) => [String(point.year), point.value]),
    );
  return {
    code,
    zh: code,
    en: code,
    town: code,
    townZh: code,
    lat: 0,
    lon: 0,
    gridLat: 0,
    gridLon: 0,
    elevationM: 0,
    annual: table(annual, first),
    summer: table((year) => (annual(year) === null ? null : 28), first),
    winter: table((year) => (year === first ? null : 14), first),
    daysMissing: {},
  };
}
const invented = (counties: TempCounty[], lastYear = 1959): TempData => ({
  source: "invented",
  sourceUrl: "https://example.org/",
  model: "invented",
  variable: "invented",
  licence: "CC BY 4.0",
  fetchedAt: "2026-01-01",
  firstYear: 1950,
  lastYear,
  minDaysPerYear: 360,
  counties,
});

describe("meanOver", () => {
  it("averages a full run of years", () => {
    expect(
      meanOver(
        line(2000, 2004, (y) => y - 2000),
        2000,
        2004,
      ),
    ).toBe(2);
  });
  it("gives nothing when a year is missing or outside the series", () => {
    const gap = line(2000, 2004, (y) => (y === 2002 ? null : 1));
    expect(meanOver(gap, 2000, 2004)).toBeNull();
    expect(
      meanOver(
        line(2000, 2004, () => 1),
        1999,
        2004,
      ),
    ).toBeNull();
  });
});

describe("trailingMean", () => {
  it("starts once a full window of years exists", () => {
    const out = trailingMean(
      line(2000, 2012, (y) => y - 2000),
      10,
    );
    expect(out.slice(0, 9).every((point) => point.value === null)).toBe(true);
    expect(out[9]).toEqual({ year: 2009, value: 4.5 });
    expect(out[12]).toEqual({ year: 2012, value: 7.5 });
  });
  it("leaves a year empty while a gap is inside its window", () => {
    const out = trailingMean(
      line(2000, 2014, (y) => (y === 2005 ? null : 1)),
      10,
    );
    expect(out[9].value).toBeNull();
    expect(out[14].value).toBeNull();
    expect(
      trailingMean(
        line(2000, 2016, (y) => (y === 2005 ? null : 1)),
        10,
      )[15].value,
    ).toBe(1);
  });
});

describe("anomalies and period change", () => {
  const rising = line(1950, 2025, (y) => 20 + (y - 1950) * 0.02);
  it("sit at zero on average across the base period", () => {
    const out = anomalies(rising);
    expect(meanOver(out, 1950, 1979)).toBeCloseTo(0, 10);
    expect(out[75].value).toBeCloseTo(1.5 - 0.29, 10);
  });
  it("are all empty when the base period is incomplete", () => {
    const broken = line(1950, 2025, (y) => (y === 1960 ? null : 20));
    expect(anomalies(broken).every((point) => point.value === null)).toBe(true);
    expect(periodChange(broken)).toBeNull();
  });
  it("gives later mean minus earlier mean", () => {
    const out = periodChange(rising);
    expect(out?.before).toBeCloseTo(20.29, 10);
    expect(out?.after).toBeCloseTo(20 + 0.02 * (2010.5 - 1950), 10);
    expect(out?.change).toBeCloseTo(0.02 * 46, 10);
  });
});

describe("trendPerDecade", () => {
  it("reads a straight line exactly", () => {
    expect(trendPerDecade(line(1950, 2025, (y) => 1 + 0.015 * y))).toBeCloseTo(
      0.15,
      10,
    );
  });
  it("skips missing years and refuses to fit fewer than ten", () => {
    expect(trendPerDecade(line(1950, 1958, (y) => y))).toBeNull();
    const gaps = line(1950, 1969, (y) => (y % 2 ? null : 0.1 * y));
    expect(trendPerDecade(gaps)).toBeCloseTo(1, 10);
  });
});

describe("warmestYears", () => {
  it("lists the highest first and gives a tie to the later year", () => {
    const out = warmestYears(
      [
        { year: 2001, value: 20 },
        { year: 2002, value: 21 },
        { year: 2003, value: 21 },
        { year: 2004, value: null },
      ],
      2,
    );
    expect(out.map((point) => point.year)).toEqual([2003, 2002]);
  });
});

describe("the island average", () => {
  const a = county("a", (y) => 20 + (y - 1950));
  const b = county("b", (y) => 22 + (y - 1950));
  const gappy = county("g", (y) => (y === 1955 ? null : 99));
  const empty = county("e", () => null);
  const data = invented([a, b, gappy, empty]);

  it("averages only the counties with a full record", () => {
    expect(fullRecordCounties(data).map((c) => c.code)).toEqual(["a", "b"]);
    expect(hasFullRecord(gappy, data)).toBe(false);
    const island = islandSeries(data, "annual");
    expect(island[0]).toEqual({ year: 1950, value: 21 });
    expect(island[9]).toEqual({ year: 1959, value: 30 });
  });
  it("never lets a gappy county pull the average or fills its gap", () => {
    expect(
      islandSeries(data, "annual").every((point) => point.value !== 99),
    ).toBe(true);
    expect(seriesOf(gappy, data, "annual")[5]).toEqual({
      year: 1955,
      value: null,
    });
  });
  it("starts the winter series a year late", () => {
    const winter = islandSeries(data, "winter");
    expect(winter[0].year).toBe(1951);
    expect(winter[0].value).toBe(14);
  });
  it("has no line at all when no county is complete", () => {
    const none = invented([empty]);
    expect(islandSeries(none, "annual").every((p) => p.value === null)).toBe(
      true,
    );
  });
});

describe("countyChanges", () => {
  it("puts the biggest rise first and counties without data last", () => {
    const wide = (code: string, rise: number | null) =>
      county(
        code,
        (y) => (rise === null ? null : 20 + rise * (y - 1950)),
        1950,
        2025,
      );
    const data = invented(
      [wide("slow", 0.01), wide("none", null), wide("fast", 0.03)],
      2025,
    );
    const out = countyChanges(data);
    expect(out.map((row) => row.county.code)).toEqual(["fast", "slow", "none"]);
    expect(out[2].result).toBeNull();
  });
});

describe("degrees", () => {
  it("writes one decimal with a real minus and no negative zero", () => {
    expect(degrees(0.74, true)).toBe("+0.7");
    expect(degrees(-0.34, true)).toBe("−0.3");
    expect(degrees(-0.04, true)).toBe("0.0");
    expect(degrees(20.416)).toBe("20.4");
    expect(degrees(-1.2)).toBe("−1.2");
  });
});

describe("the download script's yearly reduction", () => {
  const days = (
    from: string,
    to: string,
    value: (date: string) => number | null,
  ) => {
    const out: { date: string; value: number | null }[] = [];
    for (
      let time = Date.parse(`${from}T00:00:00Z`);
      time <= Date.parse(`${to}T00:00:00Z`);
      time += 86_400_000
    ) {
      const date = new Date(time).toISOString().slice(0, 10);
      out.push({ date, value: value(date) });
    }
    return out;
  };
  type Yearly = Record<string, number | null>;
  const run = (rows: { date: string; value: number | null }[]) =>
    reduce(
      rows.map((row) => row.date),
      rows.map((row) => row.value),
    ) as unknown as {
      annual: Yearly;
      summer: Yearly;
      winter: Yearly;
      daysMissing: Record<string, number>;
    };

  it("fills a winter from December of the year before", () => {
    const out = run(
      days("1950-01-01", "1952-12-31", (date) =>
        /-(12|01|02)-/.test(date) ? 10 : 20,
      ),
    );
    expect(out.winter["1950"]).toBeNull();
    expect(out.winter["1951"]).toBe(10);
    expect(out.winter["1952"]).toBe(10);
    expect(out.summer["1951"]).toBe(20);
  });
  it("only gives a year with nearly every day, never a partial mean", () => {
    const out = run(
      days("1950-01-01", "1951-12-31", (date) =>
        date >= "1951-06-01" ? null : 15,
      ),
    );
    expect(out.annual["1950"]).toBe(15);
    expect(out.annual["1951"]).toBeNull();
    expect(out.daysMissing["1951"]).toBe(214);
    expect(out.daysMissing["1950"]).toBe(0);
  });
  it("counts the extra day of a leap year as present", () => {
    const out = run(days("1952-01-01", "1952-12-31", () => 18));
    expect(out.annual["1952"]).toBe(18);
    expect(out.daysMissing["1952"]).toBe(0);
  });
});

describe("the committed temperature file", () => {
  const data = temperatureHistory;
  const counties = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "public/data/counties.geojson"),
      "utf8",
    ),
  ).features.map(
    (f: { properties: { COUNTYCODE: string } }) => f.properties.COUNTYCODE,
  );

  it("names its source, licence and period", () => {
    expect(data.source).toContain("Open-Meteo");
    expect(data.licence).toBe("CC BY 4.0");
    expect(data.sourceUrl).toMatch(/^https:\/\/open-meteo\.com\//);
    expect(data.firstYear).toBe(1950);
    expect(data.lastYear).toBe(2025);
  });
  it("has one entry for each county, with a town that exists on the list", () => {
    expect(data.counties.map((c) => c.code).sort()).toEqual(
      [...counties].sort(),
    );
    for (const c of data.counties) {
      expect(Object.keys(towns)).toContain(c.code);
      expect(c.town.length).toBeGreaterThan(2);
      expect(c.townZh.length).toBeGreaterThan(1);
    }
  });
  it("has a value for every year of a county or none at all", () => {
    for (const c of data.counties) {
      const values = Object.values(c.annual);
      expect(values, c.code).toHaveLength(76);
      const empty = values.filter((v) => v === null).length;
      expect(empty === 0 || empty === 76, `${c.code} has some years only`).toBe(
        true,
      );
    }
  });
  it("keeps every value inside what air temperature in Taiwan can be", () => {
    for (const c of data.counties)
      for (const key of ["annual", "summer", "winter"] as const)
        for (const value of Object.values(c[key]))
          if (value !== null) {
            expect(value, c.code).toBeGreaterThan(8);
            expect(value, c.code).toBeLessThan(32);
          }
  });
  it("has summers warmer than yearly averages warmer than winters", () => {
    for (const c of fullRecordCounties(data))
      for (let year = 1951; year <= 2025; year += 1) {
        const k = String(year);
        expect(c.summer[k] as number, `${c.code} ${year}`).toBeGreaterThan(
          c.annual[k] as number,
        );
        expect(c.annual[k] as number, `${c.code} ${year}`).toBeGreaterThan(
          c.winter[k] as number,
        );
      }
  });
  it("gives an island change that is small and has a sign", () => {
    const change = periodChange(islandSeries(data, "annual"));
    expect(change).not.toBeNull();
    expect(Math.abs(change!.change)).toBeLessThan(3);
  });
  it("has sources that are unique, https and in both languages", () => {
    const urls = temperatureSources.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const s of temperatureSources) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.title.zh.length).toBeGreaterThan(1);
      expect(s.used.zh.length).toBeGreaterThan(5);
    }
  });
});
