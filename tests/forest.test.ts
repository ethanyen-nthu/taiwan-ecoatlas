import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Counties } from "../src/lib/types";
import type { AtlasCollection, AtlasManifest } from "../src/lib/atlas-types";

const readJson = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../public/data/${name}`, import.meta.url), "utf8"),
  );
const manifest = readJson("atlas/forests.metadata.json") as AtlasManifest;
const stats = readJson("atlas/landcover-2023.statistics.json") as {
  year: number;
  source: {
    crs: string;
    archiveMd5: string;
    sourcePixelCount: number;
    overviewWidth: number;
    overviewHeight: number;
    members: string[];
  };
  classes: { code: number; key: string }[];
  countyStatistics: {
    countyCode: string;
    available: boolean;
    countyAreaKm2: number;
    mappedAreaKm2: number;
    forestShareMappedPct: number | null;
    classAreasKm2: Record<string, number> | null;
    sourcePixelCount: number;
  }[];
};
const summaries = readJson(
  "atlas/landcover-2023-counties.geojson",
) as AtlasCollection;
const counties = readJson("counties.geojson") as Counties;

it("does not invent a 2013 baseline or relabel the archive's 2015 file", () => {
  expect(
    manifest.datasets.find((d) => d.id === "landcover-2013"),
  ).toMatchObject({ status: "unavailable", file: null, recordCount: 0 });
  expect(stats.year).toBe(2023);
  expect(stats.source.members).toEqual([
    "2023_all_grid_wgs84.tif",
    "2015_all_grid_wgs84.tif",
  ]);
  expect(
    manifest.datasets.filter((d) => d.status === "available"),
  ).toHaveLength(2);
});

it("retains verified source provenance and unresolved class identity", () => {
  expect(stats.source.archiveMd5).toBe("9336e79e7f903f46c940746faac0eb70");
  expect(stats.source.crs).toBe("EPSG:4326");
  expect(stats.source.sourcePixelCount).toBeGreaterThan(1_000_000_000);
  expect(stats.classes.find((c) => c.code === 5)?.key).toBe("unresolved");
  for (const dataset of manifest.datasets) {
    expect(dataset.sourceUrl).toBe("https://zenodo.org/records/14033363");
    expect(dataset.licence).toBe("CC BY 4.0");
  }
});

it("preserves all 22 county summaries and nulls for unmapped offshore counties", () => {
  expect(stats.countyStatistics).toHaveLength(22);
  expect(new Set(stats.countyStatistics.map((c) => c.countyCode)).size).toBe(
    22,
  );
  expect(summaries.features).toHaveLength(19);
  for (const code of ["09007", "09020", "10016"]) {
    expect(
      stats.countyStatistics.find((c) => c.countyCode === code),
    ).toMatchObject({
      available: false,
      mappedAreaKm2: 0,
      forestShareMappedPct: null,
      classAreasKm2: null,
    });
    expect(
      summaries.features.some((f) => f.properties.countyCode === code),
    ).toBe(false);
  }
});

it("conserves mapped area across classes and uses the disclosed percentage denominator", () => {
  let pixels = 0;
  for (const county of stats.countyStatistics) {
    pixels += county.sourcePixelCount;
    if (!county.available) continue;
    const areas = county.classAreasKm2!;
    expect(
      Object.values(areas).every((area) => Number.isFinite(area) && area >= 0),
    ).toBe(true);
    expect(
      Math.abs(
        Object.values(areas).reduce((a, b) => a + b, 0) - county.mappedAreaKm2,
      ),
    ).toBeLessThan(0.006);
    expect(
      Math.abs(
        (100 * areas.forestAreaKm2) / county.mappedAreaKm2 -
          county.forestShareMappedPct!,
      ),
    ).toBeLessThan(0.011);
    expect(county.forestShareMappedPct).toBeGreaterThanOrEqual(0);
    expect(county.forestShareMappedPct).toBeLessThanOrEqual(100);
  }
  expect(pixels).toBe(stats.source.sourcePixelCount);
});

it("places derived summary markers inside their actual official county", () => {
  for (const feature of summaries.features) {
    const county = counties.features.find(
      (c) => c.properties.COUNTYCODE === feature.properties.countyCode,
    );
    expect(county).toBeDefined();
    expect(feature.geometry.type).toBe("Point");
    if (feature.geometry.type !== "Point" || !county) {
      throw new Error("County summary requires a point and an official county");
    }
    expect(booleanPointInPolygon(feature.geometry.coordinates, county)).toBe(
      true,
    );
    expect(feature.properties.date).toBe("2023");
    expect(feature.properties.datePrecision).toBe("year");
    expect(feature.properties.id).toMatch(/^landcover-2023-/);
  }
});

it("publishes bounded PNG overviews with valid geographic corners", () => {
  for (const dataset of manifest.datasets.filter((d) => d.raster)) {
    const raster = dataset.raster!;
    const bytes = readFileSync(
      new URL(`../public${raster.url}`, import.meta.url),
    );
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(bytes.readUInt32BE(16)).toBe(stats.source.overviewWidth);
    expect(bytes.readUInt32BE(20)).toBe(2048);
    expect(bytes.length).toBeLessThan(1_000_000);
    const [nw, ne, se, sw] = raster.coordinates;
    expect(nw[0]).toBeLessThan(ne[0]);
    expect(nw[1]).toBeGreaterThan(sw[1]);
    expect(nw[0]).toBe(sw[0]);
    expect(ne[0]).toBe(se[0]);
  }
});
