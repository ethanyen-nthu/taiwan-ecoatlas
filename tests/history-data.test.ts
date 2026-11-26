import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  atlas2023,
  fourthTypesPct,
  forestSources,
  inventories,
  plantationChangeHa,
  thirdIslandHa,
  thirdTypesHa,
} from "@/content/forest-history";
import {
  localiseSources,
  percentChange,
  type HistorySource,
} from "@/content/history-types";
import {
  end2025,
  ownShares,
  peoples2025,
  places2025,
  populationSources,
  publishedGrowth2011to2020,
  yearEnds,
} from "@/content/population-history";
import {
  bodLoad,
  riverSources,
  severeLength,
  severeStations,
} from "@/content/river-history";
import { sectionTabs, type SectionKey } from "@/content/section-tabs";
import { temperatureSources } from "@/content/temperature-sources";
import { urbanSources, wildlifeSources } from "@/content/year-data";

const allSources: [string, HistorySource[]][] = [
  ["rivers", riverSources],
  ["forests", forestSources],
  ["population", populationSources],
  ["wildlife", wildlifeSources],
  ["urban", urbanSources],
  ["temperature", temperatureSources],
];

describe("the sources behind the over-time pages", () => {
  it.each(allSources)(
    "%s: every source has a unique https link and both languages",
    (_name, sources) => {
      const ids = sources.map((source) => source.id);
      expect(new Set(ids).size).toBe(ids.length);
      const urls = sources.map((source) => source.url);
      expect(new Set(urls).size).toBe(urls.length);
      for (const source of sources) {
        expect(source.url, source.id).toMatch(/^https:\/\//);
        expect(source.title.en.length, source.id).toBeGreaterThan(3);
        expect(source.title.zh.length, source.id).toBeGreaterThan(1);
        expect(source.used.en.length, source.id).toBeGreaterThan(10);
        expect(source.used.zh.length, source.id).toBeGreaterThan(5);
        expect(source.publisher.length, source.id).toBeGreaterThan(3);
      }
    },
  );

  it("are translated for the page in either language", () => {
    const en = localiseSources(riverSources, "en");
    const zh = localiseSources(riverSources, "zh");
    expect(en).toHaveLength(riverSources.length);
    expect(en[0].title).not.toBe(zh[0].title);
    expect(zh[0].url).toBe(en[0].url);
  });

  it("keeps whole-percent change the way the pages print it", () => {
    expect(percentChange(519_984, 629_456)).toBe(21);
    expect(percentChange(66, 2)).toBe(-97);
  });
});

describe("rivers", () => {
  const ids = new Set(riverSources.map((source) => source.id));

  it("cites a listed source for every figure and runs forward in time", () => {
    for (const point of [...severeStations, ...severeLength])
      for (const id of point.sources) expect(ids.has(id), id).toBe(true);
    for (const id of bodLoad.sources) expect(ids.has(id)).toBe(true);
    const years = severeStations.map((point) => point.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });

  it("never turns station counts of different network sizes into shares", () => {
    expect(
      severeStations.map((point) => [point.year, point.count, point.of]),
    ).toEqual([
      [2002, 66, 293],
      [2024, 7, 303],
      [2025, 2, null],
    ]);
    for (const point of severeStations)
      if (point.of !== null) expect(point.count).toBeLessThan(point.of);
    // The two network sizes differ, which is why the page shows counts only.
    expect(severeStations[0].of).not.toBe(severeStations[1].of);
  });

  it("states the published length shares and load without invention", () => {
    expect(severeLength.map((point) => [point.year, point.percent])).toEqual([
      [2002, 14],
      [2025, 1.9],
    ]);
    expect(bodLoad.from.tonnesPerDay).toBeGreaterThan(bodLoad.to.tonnesPerDay);
  });
});

describe("forests", () => {
  const [third, fourth] = inventories;
  const ids = new Set(forestSources.map((source) => source.id));

  it("has the two inventories in order and cites listed sources", () => {
    expect(third.id).toBe("third");
    expect(fourth.id).toBe("fourth");
    expect(third.completed).toBeLessThan(fourth.completed);
    for (const inventory of inventories)
      for (const id of inventory.sources) expect(ids.has(id), id).toBe(true);
    for (const id of atlas2023.sources) expect(ids.has(id)).toBe(true);
  });

  it("matches the published cover from the published hectares", () => {
    expect(
      Math.abs((third.forestHa / thirdIslandHa) * 100 - third.coverPct),
    ).toBeLessThan(0.02);
    expect(fourth.coverPct).toBeGreaterThan(third.coverPct);
    expect(third.coverPct).toBe(58.53);
    expect(fourth.coverPct).toBe(60.71);
  });

  it("splits the 3rd inventory into types that add up to its forest area", () => {
    expect(Object.values(thirdTypesHa).reduce((a, b) => a + b, 0)).toBe(
      third.forestHa,
    );
    expect(Object.values(fourthTypesPct).reduce((a, b) => a + b, 0)).toBe(100);
    expect(plantationChangeHa).toBeLessThan(0);
  });

  it("keeps the atlas's own 2023 map apart, and equal to its county statistics", () => {
    const stats = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "public/data/atlas/landcover-2023.statistics.json",
        ),
        "utf8",
      ),
    ) as {
      countyStatistics: {
        available: boolean;
        mappedAreaKm2: number;
        classAreasKm2: { forestAreaKm2: number } | null;
      }[];
    };
    const mapped = stats.countyStatistics.filter((row) => row.available);
    expect(mapped).toHaveLength(atlas2023.countiesMapped);
    const forest = mapped.reduce(
      (sum, row) => sum + (row.classAreasKm2?.forestAreaKm2 ?? 0),
      0,
    );
    const area = mapped.reduce((sum, row) => sum + row.mappedAreaKm2, 0);
    expect(Math.abs(forest - atlas2023.forestKm2)).toBeLessThan(0.5);
    expect(Math.abs(area - atlas2023.mappedKm2)).toBeLessThan(0.5);
    // The atlas map and the inventory read differently, and the page must not
    // present the difference as a fall in forest.
    expect((atlas2023.forestKm2 / atlas2023.mappedKm2) * 100).toBeLessThan(
      fourth.coverPct,
    );
  });
});

describe("population", () => {
  const ids = new Set(populationSources.map((source) => source.id));

  it("cites listed sources and runs forward in time", () => {
    for (const row of yearEnds)
      for (const id of row.sources) expect(ids.has(id), id).toBe(true);
    const years = yearEnds.map((row) => row.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(years).toEqual([2011, 2020, 2025]);
  });

  it("agrees with the published shares and growth rates", () => {
    for (const row of yearEnds) {
      if (row.nation === null) continue;
      expect(
        Math.abs((row.people / row.nation) * 100 - row.sharePct),
        String(row.year),
      ).toBeLessThan(0.006);
    }
    const first = yearEnds[0];
    const second = yearEnds[1];
    expect(
      Math.abs(
        (second.people / first.people - 1) * 100 -
          publishedGrowth2011to2020.indigenous,
      ),
    ).toBeLessThan(0.01);
    expect(
      Math.abs(
        ((second.nation as number) / (first.nation as number) - 1) * 100 -
          publishedGrowth2011to2020.nation,
      ),
    ).toBeLessThan(0.01);
  });

  it("splits the 2025 total two ways that each add up to it", () => {
    const total = yearEnds[2].people;
    expect(total).toBe(629_456);
    expect(end2025.mountain + end2025.plains).toBe(total);
    expect(end2025.female + end2025.male).toBe(total);
    expect(end2025.medianAge).toBeLessThan(end2025.nationalMedianAge);
  });

  it("keeps the published shares by people and by county", () => {
    const total = yearEnds[2].people;
    for (const row of [...peoples2025, ...places2025])
      expect(
        Math.abs((row.people / total) * 100 - row.sharePct),
        row.key,
      ).toBeLessThan(0.06);
    const counts = peoples2025.map((row) => row.people);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    const own = ownShares.map((row) => row.sharePct);
    expect([...own].sort((a, b) => b - a)).toEqual(own);
    expect(ownShares[0].key).toBe("taitung");
    // Hualien has the most people, Taitung the largest share of its own residents.
    expect(places2025[0].key).toBe("hualien");
  });
});

describe("the tab strip", () => {
  const keys = Object.keys(sectionTabs) as SectionKey[];

  it("covers all six subjects, each with a unique key and link per tab", () => {
    expect(keys.sort()).toEqual(
      [
        "culture",
        "environment",
        "forests",
        "plants",
        "urban",
        "wildlife",
      ].sort(),
    );
    for (const key of keys) {
      const tabs = sectionTabs[key];
      expect(tabs.length, key).toBeGreaterThanOrEqual(2);
      expect(new Set(tabs.map((tab) => tab.key)).size).toBe(tabs.length);
      expect(new Set(tabs.map((tab) => tab.href)).size).toBe(tabs.length);
      for (const tab of tabs) {
        expect(tab.href).toMatch(/^\/[a-z-]+(\/[a-z-]+)?$/);
        expect(tab.label.en.length).toBeGreaterThan(2);
        expect(tab.label.zh.length).toBeGreaterThan(1);
        expect(tab.hint.en.length).toBeGreaterThan(2);
        expect(tab.hint.zh.length).toBeGreaterThan(1);
      }
    }
  });

  it("starts each subject with its main page", () => {
    expect(sectionTabs.environment[0].href).toBe("/environment");
    expect(sectionTabs.forests[0].href).toBe("/forests");
    expect(sectionTabs.wildlife[0].href).toBe("/wildlife");
    expect(sectionTabs.culture[0].href).toBe("/culture");
    expect(sectionTabs.urban[0].href).toBe("/urban");
    expect(sectionTabs.plants[0].href).toBe("/plants");
  });
});
