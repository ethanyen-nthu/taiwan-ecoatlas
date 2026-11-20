import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildChoropleth, subjectRamps } from "../src/lib/choropleth";
import type { OutlineFile } from "../src/lib/outline-map";
import {
  countyLabelSpots,
  countyLabels,
  countyTints,
  labelWidth,
} from "../src/lib/wildlife-map";

const outlines = JSON.parse(
  readFileSync("public/data/county-outlines.json", "utf8"),
) as OutlineFile;
const species = JSON.parse(
  readFileSync("public/data/atlas/wildlife.species.json", "utf8"),
) as { species: { countyCounts: Record<string, number> }[] };

describe("where the county numbers go", () => {
  const spots = countyLabelSpots(outlines);

  it("finds a spot for every county", () => {
    expect(Object.keys(spots).sort()).toEqual(Object.keys(outlines).sort());
  });

  it("keeps each spot inside its own county's frame, in real longitude and latitude", () => {
    for (const [code, spot] of Object.entries(spots)) {
      const lngs = outlines[code].rings.flat().map(([lng]) => lng);
      const lats = outlines[code].rings.flat().map(([, lat]) => lat);
      expect(spot.lng, code).toBeGreaterThanOrEqual(Math.min(...lngs));
      expect(spot.lng, code).toBeLessThanOrEqual(Math.max(...lngs));
      expect(spot.lat, code).toBeGreaterThanOrEqual(Math.min(...lats));
      expect(spot.lat, code).toBeLessThanOrEqual(Math.max(...lats));
    }
  });

  it("leaves a wide margin around the label of the large counties", () => {
    // Hualien, Taitung, Nantou and Pingtung are roomy enough for a number.
    for (const code of ["10015", "10014", "10008", "10013"])
      expect(spots[code].r, code).toBeGreaterThan(0.08);
  });

  it("hangs Kaohsiung's number on the mainland, not on a distant islet", () => {
    const kaohsiung = spots["64000"];
    expect(kaohsiung.lat).toBeGreaterThan(22.3);
    expect(kaohsiung.lat).toBeLessThan(23.5);
    expect(kaohsiung.lng).toBeGreaterThan(120);
    expect(kaohsiung.lng).toBeLessThan(121.1);
  });

  it("does not put New Taipei's label inside Taipei City", () => {
    const newTaipei = spots["65000"];
    const taipei = spots["63000"];
    const gap = Math.hypot(
      (newTaipei.lng - taipei.lng) * Math.cos((25 * Math.PI) / 180),
      newTaipei.lat - taipei.lat,
    );
    expect(gap).toBeGreaterThan(taipei.r);
  });
});

describe("county tints and labels", () => {
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
    const tints = countyTints(rows, buildChoropleth(rows, "wildlife"));
    expect(Object.keys(tints)).toHaveLength(22);
    const ramp = subjectRamps.wildlife;
    for (const fill of Object.values(tints)) expect(ramp).toContain(fill);
    // Tainan has the most records, so it is among the darker steps.
    expect(ramp.indexOf(tints["67000"])).toBeGreaterThanOrEqual(3);
    expect(ramp.indexOf(tints["10017"])).toBeLessThan(3);
  });

  it("leaves counties with no records unshaded and uses one step when classes would mislead", () => {
    const few = [
      { code: "10015", count: 4 },
      { code: "10014", count: 9 },
      { code: "10008", count: 0 },
    ];
    const tints = countyTints(few, null);
    expect(Object.keys(tints).sort()).toEqual(["10014", "10015"]);
    expect(tints["10015"]).toBe(tints["10014"]);
  });

  it("prints a number only for counties that have records", () => {
    const spots = countyLabelSpots(outlines);
    const labels = countyLabels(
      [
        { code: "10015", count: 1545 },
        { code: "10008", count: 0 },
      ],
      spots,
      (value) => value.toLocaleString("en"),
    );
    expect(labels.map((label) => label.code)).toEqual(["10015"]);
    expect(labels[0].text).toBe("1,545");
    expect(labels[0].alone).toBe(false);
    expect(countyLabels([{ code: "10015", count: 3 }], null, String)).toEqual(
      [],
    );
  });

  it("always shows the number of an island group, which has no neighbour to crowd it", () => {
    const labels = countyLabels(
      [
        { code: "09007", count: 1188 },
        { code: "10016", count: 25 },
        { code: "64000", count: 975 },
      ],
      countyLabelSpots(outlines),
      String,
    );
    expect(Object.fromEntries(labels.map((l) => [l.code, l.alone]))).toEqual({
      "09007": true,
      "10016": true,
      "64000": false,
    });
  });

  it("makes room for more digits", () => {
    expect(labelWidth("1,545")).toBeGreaterThan(labelWidth("42"));
  });
});
