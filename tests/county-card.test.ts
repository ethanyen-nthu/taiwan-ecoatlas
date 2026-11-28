import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  cardRows,
  countyCard,
  placeOf,
  shareDescription,
  shareLines,
} from "@/lib/county-card";
import type { OutlineFile } from "@/lib/outline-map";
import { groupGap, mainGroup, silhouette } from "@/lib/silhouette";
import type { CountyRef, Tour } from "@/lib/tour";
import { loadTour } from "@/server/tour";

const root = process.cwd();
const outlines = JSON.parse(
  readFileSync(path.join(root, "public/data/county-outlines.json"), "utf8"),
) as OutlineFile;
const glyphs = new Set(
  readFileSync(path.join(root, "src/assets/fonts/card-glyphs.txt"), "utf8"),
);

describe("placeOf", () => {
  const values = { a: 5, b: 9, c: 9, d: null, e: 1 };
  it("ranks from the highest figure, ties sharing a place", () => {
    expect(placeOf(values, "b")).toEqual({ n: 1, of: 4 });
    expect(placeOf(values, "c")).toEqual({ n: 1, of: 4 });
    expect(placeOf(values, "a")).toEqual({ n: 3, of: 4 });
    expect(placeOf(values, "e")).toEqual({ n: 4, of: 4 });
  });
  it("gives no place where there is no figure", () => {
    expect(placeOf(values, "d")).toBeNull();
    expect(placeOf(values, "zz")).toBeNull();
  });
});

describe("the county card", () => {
  let counties: CountyRef[];
  let tour: Tour;
  beforeAll(async () => {
    ({ counties, tour } = await loadTour());
  });

  it("is built for every county and for no other code", () => {
    expect(counties.length).toBeGreaterThanOrEqual(22);
    for (const county of counties)
      expect(countyCard(tour, counties, county.code)?.code).toBe(county.code);
    expect(countyCard(tour, counties, "nowhere")).toBeNull();
  });

  it("reads the tour's own figures, so the card cannot disagree with it", () => {
    for (const { code } of counties) {
      const card = countyCard(tour, counties, code)!;
      expect(card.air.value).toBe(tour.air.layer.values[code] ?? null);
      expect(card.warm.change).toBe(tour.warm.layer.values[code] ?? null);
      expect(card.forest.sharePct).toBe(tour.forest.layer.values[code] ?? null);
      expect(card.roadkill.count).toBe(
        tour.roadkill.layer.values[code] ?? null,
      );
    }
  });

  it("never turns a missing figure into zero", () => {
    for (const county of counties) {
      const card = countyCard(tour, counties, county.code)!;
      for (const language of ["en", "zh"] as const) {
        for (const row of cardRows(card, language)) {
          if (row.value === null) expect(row.gap.length).toBeGreaterThan(0);
          else expect(row.value).not.toMatch(/^0(\.0+)?( |%|$)/);
        }
      }
      for (const line of shareLines(card)) {
        expect(line.value.length).toBeGreaterThan(0);
        expect(line.value).not.toBe("0");
      }
    }
  });

  it("prints a dash, not a number, where a county has no forest figure", () => {
    const gaps = counties.filter(
      (county) => tour.forest.layer.values[county.code] == null,
    );
    expect(gaps.length).toBeGreaterThan(0);
    for (const county of gaps) {
      const card = countyCard(tour, counties, county.code)!;
      const forest = shareLines(card).find((line) => line.zh === "森林比例");
      expect(forest?.value).toBe("—");
      expect(shareDescription(card)).not.toContain("Forest share");
    }
  });

  it("fills the Taipei row for Taipei City only", () => {
    const withTrees = counties.filter(
      (county) =>
        cardRows(countyCard(tour, counties, county.code)!, "en").find(
          (row) => row.id === "taipei",
        )?.value !== null,
    );
    expect(withTrees.map((county) => county.code)).toEqual([
      tour.taipei.facts.code,
    ]);
  });

  it("says what each figure is, cannot tell you and comes from, in both languages", () => {
    const card = countyCard(tour, counties, counties[0].code)!;
    for (const language of ["en", "zh"] as const) {
      const rows = cardRows(card, language);
      expect(rows.map((row) => row.id)).toEqual([
        "air",
        "warm",
        "forest",
        "roadkill",
        "villages",
        "taipei",
      ]);
      for (const row of rows) {
        expect(row.what.length).toBeGreaterThan(10);
        expect(row.cannot.length).toBeGreaterThan(10);
        expect(row.source.length).toBeGreaterThan(5);
      }
    }
  });

  it("gives a link preview that names only figures the atlas has", () => {
    for (const county of counties) {
      const card = countyCard(tour, counties, county.code)!;
      const text = shareDescription(card);
      for (const line of shareLines(card))
        if (line.value === "—") expect(text).not.toContain(line.en);
      expect(text).toContain(card.zh);
    }
  });

  it("can print every word the share images use with the shipped font", () => {
    const missing = new Set<string>();
    for (const county of counties) {
      const card = countyCard(tour, counties, county.code)!;
      const words = [
        card.zh,
        card.en,
        ...shareLines(card).flatMap((line) => [line.zh, line.en, line.value]),
      ].join("");
      for (const char of words)
        if (char.trim() && !glyphs.has(char)) missing.add(char);
    }
    expect([...missing]).toEqual([]);
  });

  it("has an outline for every county, drawn to fill its box", () => {
    const box = { width: 330, height: 460 };
    for (const county of counties) {
      const outline = outlines[county.code];
      expect(outline, county.code).toBeDefined();
      const shape = silhouette(outline, box);
      expect(shape, county.code).not.toBeNull();
      expect(shape!.width).toBeLessThanOrEqual(box.width);
      expect(shape!.height).toBeLessThanOrEqual(box.height);
      const fill = Math.max(
        shape!.width / box.width,
        shape!.height / box.height,
      );
      expect(fill, county.code).toBeGreaterThan(0.95);
      expect(shape!.d.startsWith("M")).toBe(true);
    }
  });
});

describe("silhouette", () => {
  const ring = (west: number, south: number, size = 0.1) =>
    [
      [west, south],
      [west + size, south],
      [west + size, south + size],
      [west, south + size],
    ] as [number, number][];

  it("returns nothing for an outline wholly outside the map frame", () => {
    const far = { name: "far", en: "far", rings: [ring(116.7, 20.7)] };
    expect(silhouette(far, { width: 100, height: 100 })).toBeNull();
  });

  it("draws the main group of islands and leaves a distant islet off", () => {
    const near = [ring(118.2, 24.4, 0.3), ring(118.5, 24.45, 0.1)];
    const far = ring(118.2 + groupGap + 1.2, 24.4, 0.05);
    expect(mainGroup([...near, far])).toEqual(near);
    const shape = silhouette(
      { name: "x", en: "x", rings: [...near, far] },
      { width: 200, height: 200 },
    );
    expect(shape!.d.split("M").length - 1).toBe(2);
  });

  it("keeps islands within the grouping distance together", () => {
    const rings = [ring(119.3, 23.5), ring(119.3 + 0.1 + groupGap * 0.9, 23.5)];
    expect(mainGroup(rings)).toHaveLength(2);
  });

  it("leaves Kinmen's distant Wuqiu islet off, so the main islands are large", () => {
    const kinmen = outlines["09020"];
    expect(kinmen).toBeDefined();
    const all = kinmen.rings.length;
    const drawn = silhouette(kinmen, { width: 330, height: 460 })!;
    expect(drawn.d.split("M").length - 1).toBeLessThan(all);
    expect(drawn.width).toBeGreaterThan(100);
  });
});
