import { describe, expect, it } from "vitest";
import { airCounty } from "@/data/air-county";
import {
  classLabel,
  rank,
  scaleLayer,
  taipeiCode,
  forestScale,
} from "@/lib/tour";
import { loadTour } from "@/server/tour";
import { hazeScale } from "@/lib/air-map";

describe("rank", () => {
  it("sorts highest first, breaks ties by code and leaves gaps out", () => {
    expect(rank({ b: 2, a: 2, c: null, d: 5 })).toEqual([
      { code: "d", value: 5 },
      { code: "a", value: 2 },
      { code: "b", value: 2 },
    ]);
  });
});

describe("classLabel", () => {
  const scale = { breaks: [10, 20], colors: ["x", "y", "z"] };
  it("says what each class covers", () => {
    expect(classLabel(scale, 0, String).en).toBe("below 10");
    expect(classLabel(scale, 1, String).en).toBe("10 to 20");
    expect(classLabel(scale, 2, String).en).toBe("20 or more");
    expect(classLabel(scale, 1, String).zh).toBe("10 至 20");
  });
});

describe("scaleLayer", () => {
  it("hatches a county with no value and lists only the classes it uses", () => {
    const layer = scaleLayer({ a: 5, b: null, c: 12 }, hazeScale, String);
    expect(layer.fills.b).toBeNull();
    expect(layer.fills.a).toBe(hazeScale.colors[0]);
    expect(layer.fills.c).toBe(hazeScale.colors[3]);
    expect(layer.legend.map((item) => item.color)).toEqual([
      hazeScale.colors[0],
      hazeScale.colors[3],
    ]);
    expect(layer.values.b).toBeNull();
  });
  it("never turns a gap into a zero", () => {
    const layer = scaleLayer({ a: null }, forestScale, String);
    expect(layer.fills.a).toBeNull();
    expect(layer.legend).toEqual([]);
  });
});

describe("the tour, from the real data", () => {
  it("every stop's figures match what the pages count", async () => {
    const { tour, counties, villageDots } = await loadTour();
    expect(counties).toHaveLength(22);
    const codes = counties.map((county) => county.code);

    // Every shaded stop gives every county an entry; none is left out quietly.
    for (const stop of [tour.air, tour.warm, tour.forest, tour.roadkill]) {
      expect(Object.keys(stop.layer.fills).sort()).toEqual([...codes].sort());
      expect(Object.keys(stop.layer.values).sort()).toEqual([...codes].sort());
    }

    // Air: the national fall and the county map's last year.
    expect(tour.air.facts.firstValue).toBe(24);
    expect(tour.air.facts.lastValue).toBe(12.8);
    expect(tour.air.facts.dropPct).toBe(-47);
    expect(tour.air.facts.mapYear).toBe(airCounty.lastYear);
    const values = Object.values(tour.air.layer.values).filter(
      (value): value is number => value !== null,
    );
    expect(tour.air.facts.highest.value).toBe(Math.max(...values));
    expect(tour.air.facts.lowest.value).toBe(Math.min(...values));

    // Warming: 20 counties have a record, Penghu and Lienchiang do not.
    expect(tour.warm.facts.counted).toBe(20);
    expect(tour.warm.facts.missing.sort()).toEqual(["09007", "10016"]);
    expect(tour.warm.facts.change).toBeGreaterThan(0);
    expect(tour.warm.layer.fills["10016"]).toBeNull();
    expect(tour.warm.layer.fills["09007"]).toBeNull();

    // Forests: three counties were not mapped and stay hatched.
    expect(tour.forest.facts.unmapped.sort()).toEqual([
      "09007",
      "09020",
      "10016",
    ]);
    for (const code of tour.forest.facts.unmapped)
      expect(tour.forest.layer.fills[code]).toBeNull();
    expect(tour.forest.facts.highest.value).toBeGreaterThan(
      tour.forest.facts.lowest.value,
    );

    // Roadkill: the total is the sum of the counties' reports, and the top
    // three hold the share the page quotes.
    const sum = Object.values(tour.roadkill.layer.values).reduce<number>(
      (total, value) => total + (value ?? 0),
      0,
    );
    expect(tour.roadkill.facts.total).toBe(sum);
    expect(tour.roadkill.facts.firstYear).toBeLessThanOrEqual(
      tour.roadkill.facts.lastYear,
    );
    expect(tour.roadkill.facts.top).toHaveLength(3);
    const topSum = tour.roadkill.facts.top.reduce(
      (total, row) => total + row.value,
      0,
    );
    expect(tour.roadkill.facts.topSharePct).toBe(
      Math.round((100 * topSum) / sum),
    );

    // Peoples: one dot per village inside the frame, and 16 peoples.
    expect(tour.people.facts.peoples).toBe(16);
    expect(villageDots.split("M").length - 1).toBeLessThanOrEqual(
      tour.people.facts.villages,
    );
    expect(villageDots.split("M").length - 1).toBeGreaterThan(
      tour.people.facts.villages * 0.95,
    );
    const villages = Object.values(tour.people.layer.values).reduce<number>(
      (total, value) => total + (value ?? 0),
      0,
    );
    expect(villages).toBe(tour.people.facts.villages);

    // Taipei.
    expect(tour.taipei.facts.code).toBe(taipeiCode);
    expect(tour.taipei.layer.highlight).toEqual([taipeiCode]);
    expect(tour.taipei.facts.trees).toBeGreaterThan(0);
  });
});
