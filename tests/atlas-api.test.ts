import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as catalogueGET } from "@/app/api/atlas/route";
import { GET as mapGET } from "@/app/api/atlas/map/route";
import { GET } from "@/app/api/atlas/[dataset]/route";
import type {
  AtlasCollection,
  AtlasDataset,
  AtlasManifest,
  AtlasResult,
} from "@/lib/atlas-types";

vi.mock("@/server/observations", () => ({
  observationService: {
    get: vi.fn(async () => ({
      observations: [],
      retrievedAt: null,
      status: "not-configured",
    })),
  },
}));

const load = (name: string) =>
  JSON.parse(readFileSync(`public/data/atlas/${name}`, "utf8"));
const wildlife = load("wildlife.geojson") as AtlasCollection;
const villages = load("villages.geojson") as AtlasCollection;
const parks = load("taipei-parks.geojson") as AtlasCollection;
const manifests = ["forests", "wildlife", "culture", "urban"].map(
  (section) => load(`${section}.metadata.json`) as AtlasManifest,
);
const call = (dataset: string, query: Record<string, string> = {}) =>
  GET(
    new NextRequest(
      `https://ecoatlas.test/api/atlas/${encodeURIComponent(dataset)}?${new URLSearchParams(query)}`,
    ),
    { params: Promise.resolve({ dataset }) },
  );
async function result(dataset: string, query: Record<string, string> = {}) {
  const response = await call(dataset, query);
  expect(response.status).toBe(200);
  return (await response.json()) as AtlasResult;
}

beforeEach(() => {
  vi.stubEnv("MOENV_API_KEY", "");
  vi.stubEnv("CWA_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("published atlas API", () => {
  it("catalogues all five sections with source, licence and actual static record counts", async () => {
    const response = await catalogueGET();
    expect(response.status).toBe(200);
    const { datasets } = (await response.json()) as {
      datasets: AtlasDataset[];
    };
    expect(new Set(datasets.map((d) => d.section))).toEqual(
      new Set(["environment", "forests", "wildlife", "culture", "urban"]),
    );
    for (const entry of manifests.flatMap((m) => m.datasets)) {
      const dataset = datasets.find((d) => d.id === entry.id)!;
      expect(dataset).toBeDefined();
      expect(dataset.sourceUrl).toMatch(/^https:\/\//);
      expect(dataset.licence).toBeTruthy();
      if (entry.status === "available" && entry.file) {
        const file = entry.file.replace(/^\/?data\/atlas\//, "");
        expect(dataset.recordCount).toBe(
          (load(file) as AtlasCollection).features.length,
        );
      }
    }
  });

  it("paginates real records and preserves weighted map totals", async () => {
    const first = await result("wildlife");
    expect(first.total).toBe(wildlife.features.length);
    expect(first.records.map((f) => f.id)).toEqual(
      wildlife.features.slice(0, 40).map((f) => f.id),
    );
    expect(first.nextOffset).toBe(40);
    expect(
      first.collection.features.reduce(
        (sum, f) =>
          sum + (f.properties.aggregated ? Number(f.properties.count) : 1),
        0,
      ),
    ).toBe(first.total);
    const second = await result("wildlife", { offset: "40", limit: "10" });
    expect(second.records.map((f) => f.id)).toEqual(
      wildlife.features.slice(40, 50).map((f) => f.id),
    );
    expect(second.total).toBe(first.total);
  });

  it("combines county, species and inclusive historical dates against the archive", async () => {
    const seed = wildlife.features.find(
      (f) =>
        f.properties.countyCode && f.properties.date && f.properties.speciesId,
    )!;
    const { countyCode, speciesId, date } = seed.properties;
    const expected = wildlife.features.filter(
      (f) =>
        f.properties.countyCode === countyCode &&
        f.properties.speciesId === speciesId &&
        f.properties.date === date,
    );
    const data = await result("wildlife", {
      county: String(countyCode),
      species: String(speciesId),
      start: String(date),
      end: String(date),
      limit: "100",
    });
    expect(data.total).toBe(expected.length);
    expect(data.total).toBeGreaterThan(0);
    expect(data.records).toEqual(expected.slice(0, 100));
    expect(data.counties).toEqual([
      { code: countyCode, count: expected.length, value: null, measured: 0 },
    ]);
    expect(data.timeline.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(
      expected.length,
    );
    expect(
      (await result("wildlife", { start: "2000-01-01", end: "2000-12-31" }))
        .total,
    ).toBe(0);
  });

  it("scopes geography honestly and searches original cultural names", async () => {
    const seed = villages.features[0];
    const data = await result("villages", {
      q: String(seed.properties.title),
      county: String(seed.properties.countyCode),
    });
    expect(data.records.some((f) => f.id === seed.id)).toBe(true);
    expect(
      data.records.every(
        (f) => f.properties.countyCode === seed.properties.countyCode,
      ),
    ).toBe(true);
    expect((await result("taipei-parks", { county: "09020" })).total).toBe(0);
    expect((await result("taipei-parks", { county: "63000" })).total).toBe(
      parks.features.length,
    );
  });

  it("uses viewport filtering for map and details while retaining full-filter summaries", async () => {
    const seed = wildlife.features[0];
    if (seed.geometry.type !== "Point")
      throw new Error("Wildlife archive must contain generalized points");
    const [x, y] = seed.geometry.coordinates;
    const data = await result("wildlife", {
      bbox: `${x - 0.001},${y - 0.001},${x + 0.001},${y + 0.001}`,
    });
    expect(data.total).toBe(wildlife.features.length);
    expect(data.inViewport).toBeGreaterThan(0);
    expect(data.inViewport).toBeLessThan(data.total);
    expect(
      data.records.every(
        (f) =>
          f.geometry.type === "Point" &&
          Math.abs(f.geometry.coordinates[0] - x) < 0.001 &&
          Math.abs(f.geometry.coordinates[1] - y) < 0.001,
      ),
    ).toBe(true);
    expect(
      data.collection.features.reduce(
        (sum, f) =>
          sum + (f.properties.aggregated ? Number(f.properties.count) : 1),
        0,
      ),
    ).toBe(data.inViewport);
  });

  it("never restores precise wildlife fields through detail or map responses", async () => {
    const data = await result("wildlife", { limit: "100" });
    const byId = new Map(wildlife.features.map((f) => [String(f.id), f]));
    for (const record of data.records) {
      expect(record).toEqual(byId.get(String(record.id)));
      expect(record.properties.precision).toContain("not sighting location");
      expect(record.properties.coordinateUncertaintyM).toBeNull();
    }
    expect(JSON.stringify(data.records)).not.toMatch(
      /decimalLatitude|decimalLongitude|recordedBy|locality|mediaURL|roadkill\.tw\/observation/,
    );
    const pointKey = (coordinates: unknown) =>
      (coordinates as number[]).map((n) => n.toFixed(5)).join(",");
    const publishedPoints = new Set(
      wildlife.features.map((f) => pointKey(f.geometry.coordinates)),
    );
    expect(
      data.collection.features.every((f) =>
        publishedPoints.has(pointKey(f.geometry.coordinates)),
      ),
    ).toBe(true);
  });

  it("reports unavailable historical editions and absent live credentials without fabricated records", async () => {
    const historical = await result("landcover-2013");
    expect(historical.dataset.status).toBe("unavailable");
    expect(historical.total).toBe(0);
    expect(historical.collection.features).toEqual([]);
    expect(historical.dataset.limitation.en).toBeTruthy();
    for (const id of ["live-aqi", "live-weather", "river-quality"]) {
      const data = await result(id);
      expect(data.status).toBe("not-configured");
      expect(data.total).toBe(0);
      expect(data.records).toEqual([]);
    }
  });

  it("keeps undated culture layers intact when a shared map filters wildlife history", async () => {
    const response = await mapGET(
      new NextRequest(
        "https://ecoatlas.test/api/atlas/map?layers=wildlife,villages,unknown&start=2000-01-01&end=2000-12-31&species=absent-taxon",
      ),
    );
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      layers: {
        dataset: AtlasDataset;
        collection: AtlasCollection;
        total: number;
      }[];
      errors: string[];
    };
    expect(data.errors).toContain("unknown");
    expect(
      data.layers.find((layer) => layer.dataset.id === "wildlife")?.total,
    ).toBe(0);
    expect(
      data.layers.find((layer) => layer.dataset.id === "villages")?.total,
    ).toBe(villages.features.length);
    expect(
      data.layers.find((layer) => layer.dataset.id === "wildlife")?.collection
        .features,
    ).toEqual([]);
  });

  it.each([
    "bbox=,20,122,27",
    "start=2023-02-30",
    "county=private",
    "bbox=25,121,24,120",
  ])("validates shared map filters: %s", async (query) => {
    const response = await mapGET(
      new NextRequest(
        `https://ecoatlas.test/api/atlas/map?layers=wildlife&${query}`,
      ),
    );
    expect(response.status).toBe(400);
  });

  it("exports actual filtered source records with provenance columns", async () => {
    const response = await call("villages", { county: "65000", format: "csv" });
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("x-export-record-limit")).toBe("5000");
    const csv = await response.text();
    expect(csv.split("\r\n")[0]).toContain('"sourceId"');
    expect(csv.split("\r\n")).toHaveLength(
      villages.features.filter((f) => f.properties.countyCode === "65000")
        .length + 1,
    );
  });

  it.each<Record<string, string>>([
    { county: "../private" },
    { start: "2023-02-30" },
    { end: "2024-13-01" },
    { start: "2024-03-02", end: "2024-03-01" },
    { offset: "-1" },
    { offset: "1.5" },
    { limit: "0" },
    { limit: "NaN" },
    { bbox: "1,2,3" },
    { bbox: ",20,122,27" },
    { bbox: "25,121,24,120" },
    { bbox: "-181,20,122,27" },
    { bbox: "117,20,122,91" },
  ])("rejects malformed or impossible filters %j", async (query) => {
    expect((await call("wildlife", query)).status).toBe(400);
  });

  it.each([
    "unknown",
    "../../.env.local",
    "%2e%2e%2f.env.local",
    "wildlife.geojson",
    "__proto__",
  ])("does not resolve arbitrary dataset paths: %s", async (id) => {
    const response = await call(id);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Unknown dataset" });
  });
});
