import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { inCounty, validCoordinate, TAIWAN_BOUNDS } from "@/lib/geo";
import type { Counties, Observation } from "@/lib/types";
const bytes = readFileSync("public/data/counties.geojson");
const counties = JSON.parse(bytes.toString()) as Counties;
const metadata = JSON.parse(
  readFileSync("public/data/counties.metadata.json", "utf8"),
);
describe("official dataset 7442 geographical integrity", () => {
  it("preserves 22 unique bilingual counties and verified file provenance", () => {
    expect(counties.features).toHaveLength(22);
    expect(
      new Set(counties.features.map((f) => f.properties.COUNTYCODE)).size,
    ).toBe(22);
    expect(
      counties.features.every(
        (f) => f.properties.COUNTYENG && f.properties.COUNTYNAME,
      ),
    ).toBe(true);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      metadata.outputSha256,
    );
    expect(metadata.targetCrs).toBe("EPSG:4326");
    expect(metadata.simplified).toBe(false);
    expect(metadata.transformationAccuracyMetres).toBe(1);
  });
  it.each([
    ["Taipei", "63000", 121.565, 25.033],
    ["Penghu", "10016", 119.566, 23.571],
    ["Kinmen", "09020", 118.318, 24.432],
    ["Matsu", "09007", 119.932, 26.155],
    ["Green Island", "10014", 121.49, 22.65],
    ["Orchid Island", "10014", 121.55, 22.04],
  ])(
    "includes %s in its official county and the initial map extent",
    (_name, code, longitude, latitude) => {
      expect(
        inCounty({ longitude, latitude } as Observation, code, counties),
      ).toBe(true);
      expect(longitude).toBeGreaterThan(TAIWAN_BOUNDS[0][0]);
      expect(longitude).toBeLessThan(TAIWAN_BOUNDS[1][0]);
      expect(latitude).toBeGreaterThan(TAIWAN_BOUNDS[0][1]);
      expect(latitude).toBeLessThan(TAIWAN_BOUNDS[1][1]);
    },
  );
  it("rejects reversed, missing, zero and out-of-domain station coordinates", () => {
    expect(validCoordinate(121, 24)).toBe(true);
    for (const [longitude, latitude] of [
      [24, 121],
      [0, 0],
      [NaN, 25],
      [null, 25],
      ["121", "25"],
      [120, 40],
    ])
      expect(validCoordinate(longitude, latitude)).toBe(false);
  });
});
