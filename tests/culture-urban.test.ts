import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { expect, it } from "vitest";
import type { AtlasCollection, AtlasManifest } from "../src/lib/atlas-types";
import type { Counties } from "../src/lib/types";

const bytes = (name: string) =>
  readFileSync(new URL(`../public/data/${name}`, import.meta.url));
const json = (name: string) => JSON.parse(bytes(name).toString());
const counties = json("counties.geojson") as Counties;
const manifests = ["culture", "urban"].map(
  (section) => json(`atlas/${section}.metadata.json`) as AtlasManifest,
);
const collections = new Map(
  manifests.flatMap((manifest) =>
    manifest.datasets
      .filter((d) => d.file)
      .map(
        (dataset) =>
          [
            dataset.id,
            json(dataset.file!.replace("/data/", "")) as AtlasCollection,
          ] as const,
      ),
  ),
);

it("preserves unique source identities and matches manifest counts and dates", () => {
  for (const manifest of manifests) {
    for (const dataset of manifest.datasets) {
      const collection = collections.get(dataset.id)!;
      expect(collection.type).toBe("FeatureCollection");
      expect(collection.features.length).toBe(dataset.recordCount);
      expect(new Set(collection.features.map((f) => f.id)).size).toBe(
        dataset.recordCount,
      );
      const dates: string[] = [];
      for (const feature of collection.features) {
        expect(feature.id).toBe(feature.properties.id);
        expect(feature.properties.sourceId).toBe(dataset.sourceId);
        expect(feature.properties.sourceRecordId).toBeTruthy();
        expect(feature.properties.title).toBeTruthy();
        const date = feature.properties.date;
        if (date) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "1950-01-01")
            throw new Error(`Invalid observation date on ${feature.id}`);
          dates.push(date);
        }
      }
      dates.sort();
      expect(dataset.dateRange).toEqual(
        dates.length ? [dates[0], dates[dates.length - 1]] : null,
      );
      expect(dataset.licence).toBe("Open Government Data License 1.0");
      expect(dataset.licenceUrl).toBe("https://data.gov.tw/license");
    }
  }
});

it("locates all villages and systematic urban samples inside source counties", () => {
  for (const [id, collection] of collections) {
    if (id === "public-historic-trails") continue;
    const step =
      id === "villages"
        ? 1
        : Math.max(1, Math.floor(collection.features.length / 150));
    for (let i = 0; i < collection.features.length; i += step) {
      const feature = collection.features[i];
      expect(feature.geometry.type).toBe("Point");
      const county = counties.features.find(
        (c) => c.properties.COUNTYCODE === feature.properties.countyCode,
      );
      expect(county).toBeDefined();
      expect(booleanPointInPolygon(feature as never, county!)).toBe(true);
      if (id !== "villages")
        expect(feature.properties.countyCode).toBe("63000");
    }
  }
});

it("retains source-listed cultural identities without treating listing as founding dates", () => {
  const villages = collections.get("villages")!.features;
  expect(villages).toHaveLength(730);
  expect(villages.every((f) => f.properties.date === null)).toBe(true);
  const tampya = villages.find((f) => f.properties.sourceRecordId === "1");
  expect(tampya?.properties).toMatchObject({
    traditionalName: "Tampya",
    group: "泰雅族",
    countyCode: "65000",
    listedAt: "2022-07-25",
  });
  const profiles = json("atlas/cultural-trails.json") as {
    geometry: null;
    studyYear: number;
    sourceUrl: string;
    descriptionZh: string;
    associatedCommunitiesZh: string;
  }[];
  expect(profiles).toHaveLength(8);
  for (const profile of profiles) {
    expect(profile.geometry).toBeNull();
    expect(profile.studyYear).toBe(2011);
    expect(profile.sourceUrl).toBe("https://data.gov.tw/dataset/166817");
    expect(profile.descriptionZh.length).toBeGreaterThan(20);
    expect(profile.associatedCommunitiesZh).toBeTruthy();
  }
});

it("publishes real line routes only for trails explicitly open to public access", () => {
  const trails = collections.get("public-historic-trails")!.features;
  expect(trails).toHaveLength(24);
  for (const trail of trails) {
    expect(["LineString", "MultiLineString"]).toContain(trail.geometry.type);
    expect(trail.properties.publicAccess).toBe(true);
    expect(trail.properties.sourceServiceStatus).toBe(1);
    expect(trail.properties.title).toContain("古道");
    expect(trail.properties.intersectingCountyCodes).toBeTruthy();
    const pairs =
      trail.geometry.type === "LineString"
        ? trail.geometry.coordinates
        : trail.geometry.type === "MultiLineString"
          ? trail.geometry.coordinates.flat()
          : [];
    expect(pairs.length).toBeGreaterThan(1);
    for (const [lon, lat] of pairs) {
      if (lon < 117 || lon > 125 || lat < 20 || lat > 27)
        throw new Error(`Non-WGS84 Taiwan route coordinate in ${trail.id}`);
    }
  }
});

it("keeps historical inventory dates missing where invalid and retains one-time survey limits", () => {
  const parkTrees = collections.get("taipei-park-trees")!.features;
  const riverside = collections.get("taipei-riverside-trees")!.features;
  expect(parkTrees.filter((f) => f.properties.date === null)).toHaveLength(481);
  expect(riverside.filter((f) => f.properties.date === null)).toHaveLength(2);
  expect(parkTrees).toHaveLength(85177);
  expect(riverside).toHaveLength(10735);
  const riverManifest = manifests[1].datasets.find(
    (d) => d.id === "taipei-riverside-trees",
  )!;
  expect(riverManifest.limitation.en).toContain("One-time 2016–2017");
  expect(riverManifest.updatedAt).toBe("2023-07-05");
});

it("matches independently hashed output bytes against recorded import provenance", () => {
  for (const section of ["culture", "urban"]) {
    const provenance = json(`atlas/${section}.provenance.json`) as Record<
      string,
      {
        file?: string;
        sha256?: string;
        bytes?: number;
      }
    >;
    for (const record of Object.values(provenance)) {
      if (!record?.file) continue;
      const output = bytes(record.file.replace("/data/", ""));
      expect(createHash("sha256").update(output).digest("hex")).toBe(
        record.sha256,
      );
      expect(output.length).toBe(record.bytes);
    }
  }
});
