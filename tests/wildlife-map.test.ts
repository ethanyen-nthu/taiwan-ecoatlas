import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildChoropleth, subjectRamps } from "../src/lib/choropleth";
import type { OutlineFile } from "../src/lib/outline-map";
import {
  buildIslandMap,
  countyFills,
  labelFits,
  offshoreCounties,
} from "../src/lib/wildlife-map";

const outlines = JSON.parse(
  readFileSync("public/data/county-outlines.json", "utf8"),
) as OutlineFile;
const species = JSON.parse(
  readFileSync("public/data/atlas/wildlife.species.json", "utf8"),
) as { species: { countyCounts: Record<string, number> }[] };

describe("the island map behind the roadkill page", () => {
  const map = buildIslandMap(outlines);

  it("draws every county on the main island and leaves the offshore ones to the side", () => {
    const drawn = new Set(map.shapes.map((shape) => shape.code));
    for (const code of offshoreCounties) expect(drawn.has(code)).toBe(false);
    expect(drawn.size).toBe(Object.keys(outlines).length - 3);
    expect(map.width).toBeLessThanOrEqual(360);
    expect(map.height).toBeLessThanOrEqual(620);
    expect(map.height).toBeGreaterThan(map.width);
  });

  it("keeps every drawn point inside the picture, even for Kaohsiung's distant islets", () => {
    for (const shape of map.shapes) {
      const numbers = [...shape.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) =>
        Number(m[0]),
      );
      const xs = numbers.filter((_, i) => i % 2 === 0);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(-40);
      expect(Math.max(...xs)).toBeLessThanOrEqual(map.width + 40);
    }
  });

  it("finds a label spot inside each large county and none that sit on a border", () => {
    const anchors = new Map(map.shapes.map((s) => [s.code, s.anchor]));
    // Hualien, Taitung, Nantou and Pingtung are wide enough for a number.
    for (const code of ["10015", "10014", "10008", "10013"]) {
      const anchor = anchors.get(code);
      expect(anchor, code).toBeTruthy();
      expect(anchor!.r).toBeGreaterThan(8);
    }
    for (const shape of map.shapes) {
      if (!shape.anchor) continue;
      expect(shape.anchor.x).toBeGreaterThan(0);
      expect(shape.anchor.x).toBeLessThan(map.width);
      expect(shape.anchor.y).toBeGreaterThan(0);
      expect(shape.anchor.y).toBeLessThan(map.height);
    }
  });

  it("does not put New Taipei's label inside Taipei City", () => {
    const newTaipei = map.shapes.find((s) => s.code === "65000")!.anchor!;
    const taipei = map.shapes.find((s) => s.code === "63000")!.anchor!;
    const gap = Math.hypot(newTaipei.x - taipei.x, newTaipei.y - taipei.y);
    expect(gap).toBeGreaterThan(taipei.r);
  });
});

describe("county fills", () => {
  const totals: Record<string, number> = {};
  for (const item of species.species)
    for (const [code, n] of Object.entries(item.countyCounts))
      totals[code] = (totals[code] ?? 0) + n;
  const rows = Object.entries(totals).map(([code, count]) => ({
    code,
    value: null,
    count,
  }));

  it("shades the real county totals with the wildlife ramp, light to dark", () => {
    const choropleth = buildChoropleth(rows, "wildlife");
    const fills = countyFills(rows, choropleth);
    expect(Object.keys(fills)).toHaveLength(22);
    const ramp = subjectRamps.wildlife;
    for (const fill of Object.values(fills)) expect(ramp).toContain(fill.fill);
    // Tainan has the most records, so it is among the darker steps.
    expect(fills["67000"].step).toBeGreaterThanOrEqual(3);
    expect(fills["67000"].ink).toBe("light");
    expect(fills["10017"].ink).toBe("dark");
  });

  it("leaves counties with no records unshaded and uses one step when classes would mislead", () => {
    const few = [
      { code: "10015", count: 4 },
      { code: "10014", count: 9 },
      { code: "10008", count: 0 },
    ];
    const fills = countyFills(few, null);
    expect(Object.keys(fills).sort()).toEqual(["10014", "10015"]);
    expect(fills["10015"].fill).toBe(fills["10014"].fill);
  });

  it("only prints a count where it fits", () => {
    expect(labelFits("1,545", 20)).toBe(true);
    expect(labelFits("1,545", 10)).toBe(false);
    expect(labelFits("42", 10)).toBe(true);
  });
});
