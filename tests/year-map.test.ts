import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { build, counties, reduceRows } from "../scripts/build-air-county.mjs";
import { airCounty } from "@/data/air-county";
import { temperatureHistory as data } from "@/data/temperature";
import { classOf, countyShapes, type MapScale } from "@/lib/county-shapes";
import type { OutlineFile } from "@/lib/outline-map";
import { temperatureMapData, warmingScales } from "@/lib/temperature-map";
import { periodMean, usedClassRange, yearRuns } from "@/lib/year-map";

const scale: MapScale = { breaks: [0, 10], colors: ["a", "b", "c"] };
const outlines = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public/data/county-outlines.json"),
    "utf8",
  ),
) as OutlineFile;

describe("classOf", () => {
  it("puts a value in the first class whose upper edge it is below", () => {
    expect(classOf(-5, scale)).toBe(0);
    expect(classOf(0, scale)).toBe(1);
    expect(classOf(9.99, scale)).toBe(1);
    expect(classOf(10, scale)).toBe(2);
    expect(classOf(1000, scale)).toBe(2);
  });
});

describe("periodMean", () => {
  const years = [2001, 2002, 2003, 2004];
  it("averages the years it needs", () => {
    expect(periodMean(years, [1, 2, 3, 4], 2002, 2003)).toBe(2.5);
  });
  it("gives null, never zero, when a year is missing or not in the record", () => {
    expect(periodMean(years, [1, null, 3, 4], 2001, 2003)).toBeNull();
    expect(periodMean(years, [1, 2, 3, 4], 2003, 2006)).toBeNull();
  });
});

describe("usedClassRange", () => {
  it("finds the first and last class that any value reaches, skipping gaps", () => {
    expect(
      usedClassRange(
        [
          [null, 5],
          [3, null],
        ],
        scale,
      ),
    ).toEqual([1, 1]);
    expect(usedClassRange([[-1, null], [50]], scale)).toEqual([0, 2]);
    expect(usedClassRange([[null, null]], scale)).toBeNull();
  });
});

describe("yearRuns", () => {
  it("starts on decades and cuts to the years there are", () => {
    expect(yearRuns(1950, 2025, 10)[0]).toEqual({ from: 1950, to: 1959 });
    expect(yearRuns(1951, 2025, 10)[0]).toEqual({ from: 1951, to: 1959 });
    const runs = yearRuns(1950, 2025, 10);
    expect(runs).toHaveLength(8);
    expect(runs[runs.length - 1]).toEqual({ from: 2020, to: 2025 });
  });
});

describe("countyShapes", () => {
  const set = countyShapes(outlines);
  it("draws all 22 counties and keeps every point inside the frame", () => {
    expect(set.shapes.map((shape) => shape.code).sort()).toEqual(
      Object.keys(outlines).sort(),
    );
    for (const shape of set.shapes) {
      const numbers = shape.d.match(/-?\d+/g)!.map(Number);
      for (let i = 0; i < numbers.length; i += 2) {
        expect(numbers[i], shape.code).toBeGreaterThanOrEqual(0);
        expect(numbers[i], shape.code).toBeLessThanOrEqual(set.width);
        expect(numbers[i + 1], shape.code).toBeGreaterThanOrEqual(0);
        expect(numbers[i + 1], shape.code).toBeLessThanOrEqual(set.height);
      }
    }
  });
  it("leaves off the far islets that two counties own", () => {
    // Kaohsiung's outline reaches the South China Sea; Yilan's, the east.
    const kaohsiung = set.shapes.find((shape) => shape.code === "64000")!;
    const rings = kaohsiung.d.split("Z").filter(Boolean).length;
    expect(rings).toBeLessThan(outlines["64000"].rings.length);
  });
  it("draws small counties after the big ones around them", () => {
    const order = set.shapes.map((shape) => shape.code);
    expect(order.indexOf("65000")).toBeLessThan(order.indexOf("63000"));
  });
});

describe("temperatureMapData", () => {
  const annual = temperatureMapData(data, "annual");
  const winter = temperatureMapData(data, "winter");
  it("gives every county a row aligned with the years", () => {
    expect(Object.keys(annual.anomaly)).toHaveLength(22);
    for (const row of Object.values(annual.anomaly))
      expect(row).toHaveLength(annual.years.length);
    expect(annual.years[0]).toBe(1950);
    expect(winter.years[0]).toBe(1951);
    expect(winter.base).toEqual({ from: 1951, to: 1979 });
  });
  it("leaves the two counties with no model values as gaps, not zeros", () => {
    for (const code of ["10016", "09007"]) {
      expect(annual.anomaly[code].every((value) => value === null)).toBe(true);
      for (const decade of annual.decades)
        expect(decade.values[code]).toBeNull();
    }
    expect(annual.counted).toBe(20);
  });
  it("is about zero over the base period and positive lately", () => {
    for (const code of ["63000", "10014"]) {
      const base = annual.anomaly[code].slice(0, 30);
      const mean = base.reduce((sum, value) => sum! + value!, 0)! / 30;
      expect(Math.abs(mean)).toBeLessThan(1e-9);
      expect(
        annual.decades[annual.decades.length - 1].values[code],
      ).toBeGreaterThan(0.5);
    }
  });
  it("splits the record into decades, the last one short", () => {
    expect(annual.decades.map((decade) => decade.id)[0]).toBe("1950-1959");
    expect(annual.decades[7]).toMatchObject({ from: 2020, to: 2025 });
    expect(winter.decades[0]).toMatchObject({ from: 1951, to: 1959 });
  });
  it("uses classes the whole record fits, so no colour is lost off the end", () => {
    for (const season of ["annual", "summer", "winter"] as const) {
      const m = temperatureMapData(data, season);
      const range = usedClassRange(
        Object.values(m.anomaly),
        warmingScales[season],
      )!;
      expect(range[0]).toBeGreaterThanOrEqual(0);
      expect(range[1]).toBeLessThanOrEqual(
        warmingScales[season].colors.length - 1,
      );
    }
  });
});

describe("county PM2.5 table", () => {
  it("has 22 counties and five full years, and says where it comes from", () => {
    expect(airCounty.counties).toHaveLength(22);
    expect(airCounty.firstYear).toBe(2021);
    expect(airCounty.lastYear).toBe(2025);
    for (const county of airCounty.counties) {
      for (let year = 2021; year <= 2025; year += 1) {
        const value = county.values[String(year)];
        expect(value, `${county.en} ${year}`).toBeGreaterThan(3);
        expect(value, `${county.en} ${year}`).toBeLessThan(30);
      }
    }
    expect(airCounty.sourceUrl).toBe("https://data.gov.tw/dataset/89030");
  });
  it("uses the official county codes that the outlines use", () => {
    expect(airCounty.counties.map((county) => county.code).sort()).toEqual(
      Object.keys(outlines).sort(),
    );
  });
  it("keeps only whole-year rows and turns a non-number into a gap", () => {
    const rows = [
      { item1: "114年", item2: "臺北市", value2: "9.7" },
      { item1: "114年 3月", item2: "臺北市", value2: "30.0" },
      { item1: "113年", item2: "臺北市", value2: "" },
      { item1: "113年", item2: "總計", value2: "12.8" },
    ];
    expect(reduceRows(rows)).toEqual([
      { name: "臺北市", year: 2025, pm25: 9.7 },
      { name: "臺北市", year: 2024, pm25: null },
      { name: "總計", year: 2024, pm25: 12.8 },
    ]);
    const built = build(rows, "2026-11-27");
    const taipei = built.counties.find(
      (county: { zh: string }) => county.zh === "臺北市",
    );
    expect(taipei?.values).toEqual({ 2024: null, 2025: 9.7 });
    expect(Object.keys(counties)).toHaveLength(22);
  });
});
