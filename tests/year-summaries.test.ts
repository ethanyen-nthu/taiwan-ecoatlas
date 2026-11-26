import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { summarise } from "../scripts/build-year-summaries.mjs";
import { LIENCHIANG, yearSummaries } from "@/content/year-data";

const root = process.cwd();
const atlas = (name: string) =>
  JSON.parse(
    readFileSync(path.join(root, "public/data/atlas", name), "utf8"),
  ) as { features: { properties: Record<string, unknown> }[] };

describe("the year-by-year summaries", () => {
  it("match a fresh count of the atlas files, so the pages cannot drift from the data", () => {
    expect(summarise()).toEqual(yearSummaries);
  });

  it("count every record in the atlas exactly once", () => {
    expect(yearSummaries.wildlife.records).toBe(
      atlas("wildlife.geojson").features.length,
    );
    expect(yearSummaries.parks.total).toBe(
      atlas("taipei-parks.geojson").features.length,
    );
    expect(yearSummaries.trees.park.total).toBe(
      atlas("taipei-park-trees.geojson").features.length,
    );
    expect(yearSummaries.trees.riverside.total).toBe(
      atlas("taipei-riverside-trees.geojson").features.length,
    );
    expect(yearSummaries.wildlife.records).toBe(10841);
    expect(yearSummaries.parks.total).toBe(812);
    expect(yearSummaries.trees.park.total).toBe(85177);
    expect(yearSummaries.trees.riverside.total).toBe(10735);
  });

  it("add up: years, animal groups and months all sum to the same records", () => {
    const { years, records } = yearSummaries.wildlife;
    expect(years.reduce((sum, row) => sum + row.records, 0)).toBe(records);
    for (const row of years) {
      expect(
        Object.values(row.byClass).reduce((sum, value) => sum + value, 0),
        `${row.year} groups`,
      ).toBe(row.records);
      expect(row.byMonth).toHaveLength(12);
      expect(
        row.byMonth.reduce((sum, value) => sum + value, 0),
        `${row.year} months`,
      ).toBe(row.records);
    }
    expect(years.map((row) => row.year)).toEqual([2014, 2015, 2016, 2017]);
  });

  it("list counties whose yearly counts sum to their total", () => {
    const { topCounties, records } = yearSummaries.wildlife;
    expect(topCounties).toHaveLength(8);
    let previous = Infinity;
    for (const county of topCounties) {
      expect(county.total).toBeLessThanOrEqual(previous);
      previous = county.total;
      expect(
        Object.values(county.byYear).reduce((sum, value) => sum + value, 0),
        county.code,
      ).toBe(county.total);
      expect(county.name.en.length).toBeGreaterThan(0);
      expect(county.name.zh.length).toBeGreaterThan(0);
      expect(county.total).toBeLessThan(records);
    }
  });

  it("show what the wildlife page says about 2017 and Lienchiang", () => {
    const { years, topCounties } = yearSummaries.wildlife;
    const lienchiang = topCounties.find((row) => row.code === LIENCHIANG)!;
    expect(lienchiang.name.en).toBe("Lienchiang County");
    expect(lienchiang.byYear["2016"]).toBe(12);
    expect(lienchiang.byYear["2017"]).toBe(1157);
    const at = (year: number) => years.find((row) => row.year === year)!;
    expect(at(2016).records).toBe(2269);
    expect(at(2017).records).toBe(5013);
    // Without that county the rise is 71%, not 121%.
    const without2016 = at(2016).records - 12;
    const without2017 = at(2017).records - 1157;
    expect(Math.round(((without2017 - without2016) / without2016) * 100)).toBe(
      71,
    );
    expect(Math.round(((5013 - 2269) / 2269) * 100)).toBe(121);
    // The first year has no records in the last two months, shown as a gap.
    expect(at(2014).byMonth.slice(10)).toEqual([0, 0]);
    expect(at(2015).byMonth.every((value) => value > 0)).toBe(true);
    expect(at(2014).taxa).toBe(55);
    expect(at(2017).taxa).toBe(80);
  });

  it("count parks by decade built, with the undated ones left out", () => {
    const { parks } = yearSummaries;
    expect(parks.withYear + parks.withoutYear).toBe(parks.total);
    expect(parks.byDecade.reduce((sum, row) => sum + row.parks, 0)).toBe(
      parks.withYear,
    );
    const decades = parks.byDecade.map((row) => row.decade);
    expect([...decades].sort((a, b) => a - b)).toEqual(decades);
    expect(parks.oldest.year).toBe(1899);
    expect(parks.newest.year).toBe(2025);
    const early = parks.byDecade.filter((row) => row.decade < 1960);
    expect(early.reduce((sum, row) => sum + row.parks, 0)).toBe(3);
    const peak = parks.byDecade.reduce((a, b) => (b.parks > a.parks ? b : a));
    expect(peak.decade).toBe(1980);
    const biggest = parks.byDecade.reduce((a, b) =>
      b.areaHa > a.areaHa ? b : a,
    );
    expect(biggest.decade).toBe(1990);
  });

  it("count tree records by survey year, with undated ones kept apart", () => {
    const { park, riverside } = yearSummaries.trees;
    for (const set of [park, riverside]) {
      expect(
        Object.values(set.byYear).reduce((sum, value) => sum + value, 0) +
          set.undated,
      ).toBe(set.total);
    }
    expect(park.undated).toBe(481);
    expect(riverside.undated).toBe(2);
    // The park-tree file is silent for 2017 to 2021: shown as a gap on the page.
    for (const year of ["2017", "2018", "2019", "2020", "2021"])
      expect(park.byYear[year]).toBeUndefined();
    expect(park.firstDate).toBe("2016-06-02");
    expect(riverside.firstDate).toBe("2016-11-04");
    expect(riverside.lastDate).toBe("2017-06-16");
  });
});
