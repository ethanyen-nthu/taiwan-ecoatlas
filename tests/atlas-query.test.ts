import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { queryAtlas, filterAtlas, csvExport } from "@/lib/atlas-query";
import type { AtlasCollection, AtlasDataset } from "@/lib/atlas-types";
const dataset = {
  id: "test",
  section: "environment",
  fields: [{ key: "value", label: { en: "Value", zh: "數值" } }],
} as AtlasDataset;
const collection: AtlasCollection = {
  type: "FeatureCollection",
  features: [1, 2, 3].map((id) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [121.5, 25] },
    properties: {
      id: String(id),
      title: id === 1 ? "=Unsafe CSV formula" : "Test observation",
      sourceId: "TEST ONLY",
      date: `2026-01-0${id}`,
      countyCode: id === 3 ? "65000" : "63000",
      category: "test",
      value: id === 3 ? null : id,
    },
  })),
};
it("aggregates identical map locations without dropping records or converting missing values to zero", () => {
  const result = queryAtlas(dataset, collection, { metric: "value" });
  expect(result.total).toBe(3);
  expect(result.collection.features).toHaveLength(1);
  expect(result.collection.features[0].properties.count).toBe(3);
  expect(
    result.counties.find((item) => item.code === "65000")?.value,
  ).toBeNull();
  expect(result.counties.find((item) => item.code === "63000")?.value).toBe(
    1.5,
  );
});
it("filters dates, counties and viewports and preserves year-only classification dates", () => {
  expect(
    queryAtlas(dataset, collection, { county: "63000", end: "2026-01-01" })
      .total,
  ).toBe(1);
  expect(
    queryAtlas(dataset, collection, { bbox: [120, 23, 121, 24] }).inViewport,
  ).toBe(0);
  const annual = structuredClone(collection);
  annual.features[0].properties.date = "2023";
  expect(
    filterAtlas(annual, { start: "2023-06-01", end: "2023-12-31" }).map(
      (item) => item.properties.date,
    ),
  ).toEqual(["2023"]);
});
it("exports original IDs and blank missing values with CSV formula protection", () => {
  const text = csvExport(dataset, collection.features);
  expect(text).toContain("'=Unsafe CSV formula");
  expect(text).not.toContain('"null"');
  expect(text).toContain('"1"');
});
it("removes the classification image when the requested year has no source data", () => {
  const forest = JSON.parse(
    readFileSync("public/data/atlas/forests.metadata.json", "utf8"),
  ).datasets[0] as AtlasDataset;
  const pixels = JSON.parse(
    readFileSync("public/data/atlas/landcover-2023-counties.geojson", "utf8"),
  ) as AtlasCollection;
  const absent = queryAtlas(forest, pixels, {
    start: "2022-01-01",
    end: "2022-12-31",
  });
  expect(absent.total).toBe(0);
  expect(absent.dataset.raster).toBeUndefined();
  const available = queryAtlas(forest, pixels, {
    start: "2023-01-01",
    end: "2023-12-31",
  });
  expect(available.total).toBe(19);
  expect(available.dataset.raster?.url).toBeTruthy();
});
