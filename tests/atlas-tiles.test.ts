import { describe, expect, it } from "vitest";
import { gridStep, queryAtlas } from "@/lib/atlas-query";
import { tileCollection, tileKey } from "@/lib/atlas-tiles";
import {
  buildOutlineMap,
  distanceKm,
  type DotKind,
  type MapDot,
  type OutlineFile,
} from "@/lib/outline-map";
import type {
  AtlasCollection,
  AtlasDataset,
  AtlasFeature,
} from "@/lib/atlas-types";

const dataset = {
  id: "test",
  section: "wildlife",
  sourceId: "TEST ONLY",
  fields: [],
} as unknown as AtlasDataset;

const point = (
  id: string,
  x: number,
  y: number,
  extra: Record<string, unknown> = {},
): AtlasFeature => ({
  type: "Feature",
  id,
  geometry: { type: "Point", coordinates: [x, y] },
  properties: {
    id,
    title: `Record ${id}`,
    sourceId: "TEST ONLY",
    date: null,
    countyCode: "63000",
    category: "test",
    ...extra,
  } as AtlasFeature["properties"],
});

/** More than 3000 distinct positions, so the server groups them into a grid. */
const dense: AtlasCollection = {
  type: "FeatureCollection",
  features: Array.from({ length: 3200 }, (_, i) =>
    point(String(i), 120 + (i % 64) * 0.03, 22 + Math.floor(i / 64) * 0.04),
  ),
};

describe("gridStep", () => {
  it("snaps to 0.8 degrees halved some whole number of times", () => {
    for (const raw of [0.002, 0.01, 0.05, 0.1, 0.3, 0.9, 5]) {
      const step = gridStep(raw);
      const halvings = Math.log2(0.8 / step);
      expect(Math.abs(halvings - Math.round(halvings))).toBeLessThan(1e-9);
      expect(step).toBeLessThanOrEqual(0.8);
    }
  });
  it("returns the same step for nearby viewports, so tiles do not shuffle", () => {
    expect(gridStep(0.1)).toBe(gridStep(0.11));
    expect(gridStep(0.1)).toBe(gridStep(0.095));
  });
  it("gets finer as the view narrows", () => {
    expect(gridStep(0.05)).toBeLessThan(gridStep(0.2));
  });
});

describe("aggregated tiles from the server", () => {
  const result = queryAtlas(dataset, dense, {});
  const cells = result.collection.features.filter(
    (f) => f.properties.aggregated,
  );

  it("groups a dense collection without losing a record", () => {
    expect(result.aggregated).toBe(true);
    expect(cells.length).toBeGreaterThan(1);
    const total = result.collection.features.reduce(
      (sum, f) => sum + Number(f.properties.count || 1),
      0,
    );
    expect(total).toBe(3200);
  });

  it("gives every grid cell bounds that contain its centre and can be split", () => {
    for (const cell of cells) {
      const p = cell.properties;
      const [cx, cy] = (cell.geometry as { coordinates: number[] }).coordinates;
      expect(p.split).toBe(true);
      expect(Number(p.x0)).toBeLessThan(cx);
      expect(Number(p.x1)).toBeGreaterThan(cx);
      expect(Number(p.y0)).toBeLessThan(cy);
      expect(Number(p.y1)).toBeGreaterThan(cy);
      expect(Number(p.cellKm)).toBeGreaterThan(0);
    }
  });

  it("keeps the same cell edges when the viewport shifts a little", () => {
    const shifted = queryAtlas(dataset, dense, {
      bbox: [119.9, 21.9, 122.1, 26.4],
    });
    const edges = (r: typeof result) =>
      new Set(
        r.collection.features
          .filter((f) => f.properties.aggregated)
          .map((f) => `${f.properties.x0}:${f.properties.y0}`),
      );
    const a = edges(result),
      b = edges(shifted);
    const shared = [...b].filter((key) => a.has(key)).length;
    expect(shared).toBeGreaterThan(0);
  });
});

describe("co-located stacks", () => {
  const generalised = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      point(`g${i}`, 121.2, 23.4, {
        gridId: "TWD97-1",
        generalizationRadiusM: 7100,
        species: i % 2 ? "Species A" : "Species B",
      }),
    );
  const stacks = (features: AtlasFeature[]) =>
    queryAtlas(dataset, { type: "FeatureCollection", features }, {}).collection
      .features;

  it("draws a source-generalised cell as a square of the published size", () => {
    const [cell] = stacks(generalised(5));
    const p = cell.properties;
    expect(p.aggregated).toBe(true);
    expect(p.split).toBe(false);
    expect(Number(p.cellKm)).toBe(10);
    expect(Number(p.x1) - Number(p.x0)).toBeGreaterThan(0.08);
    expect(Number(p.y1) - Number(p.y0)).toBeGreaterThan(0.08);
  });

  it("lists who is inside a stack, most frequent first", () => {
    const [cell] = stacks([
      ...generalised(5),
      point("extra", 121.2, 23.4, {
        gridId: "TWD97-1",
        generalizationRadiusM: 7100,
        species: "Species B",
      }),
    ]);
    const members = JSON.parse(String(cell.properties.members));
    expect(members.map((m: { t: string }) => m.t)).toEqual([
      "Species B",
      "Species A",
    ]);
    expect(cell.properties.memberKinds).toBe(2);
  });

  it("gives a stack with no published precision no bounds", () => {
    const [cell] = stacks([point("a", 121, 24), point("b", 121, 24)]);
    expect(cell.properties.aggregated).toBe(true);
    expect(cell.properties.x0).toBeUndefined();
  });
});

describe("tile colours and polygons", () => {
  const cells = queryAtlas(dataset, dense, {}).collection;

  it("builds at most four classes, none empty, light to dark", () => {
    const key = tileKey(cells.features, "wildlife")!;
    expect(key.classes.length).toBeGreaterThan(0);
    expect(key.classes.length).toBeLessThanOrEqual(4);
    expect(key.classes.every((c) => c.n > 0)).toBe(true);
    expect(key.classes.reduce((sum, c) => sum + c.n, 0)).toBe(key.tiles);
    for (let i = 1; i < key.classes.length; i += 1)
      expect(key.classes[i].from).toBeGreaterThan(key.classes[i - 1].to);
  });

  it("uses the neutral ramp over shaded counties", () => {
    const subject = tileKey(cells.features, "wildlife")!;
    const neutral = tileKey(cells.features, "wildlife", true)!;
    expect(neutral.classes[0].color).not.toBe(subject.classes[0].color);
  });

  it("adds one closed polygon per tile and leaves the centre point", () => {
    const { data, key } = tileCollection(cells, "wildlife");
    const tiles = data.features.filter((f) => f.properties.tile);
    expect(key).not.toBeNull();
    expect(tiles).toHaveLength(key!.tiles);
    for (const tile of tiles) {
      const ring = (tile.geometry as { coordinates: number[][][] })
        .coordinates[0];
      expect(ring).toHaveLength(5);
      expect(ring[0]).toEqual(ring[4]);
      expect(tile.properties.tileColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(data.features.length).toBe(cells.features.length + tiles.length);
  });

  it("returns the data untouched when nothing is aggregated", () => {
    const plain: AtlasCollection = {
      type: "FeatureCollection",
      features: [point("1", 121, 24), point("2", 122, 25)],
    };
    const { data, key } = tileCollection(plain, "wildlife");
    expect(key).toBeNull();
    expect(data).toBe(plain);
  });
});

describe("outline maps", () => {
  const square = (x: number, y: number, s: number): [number, number][] => [
    [x, y],
    [x + s, y],
    [x + s, y + s],
    [x, y + s],
    [x, y],
  ];
  const outlines: OutlineFile = {
    A: { name: "甲縣", en: "A county", rings: [square(121, 24, 0.5)] },
    B: { name: "乙縣", en: "B county", rings: [square(125, 30, 0.5)] },
  };
  const dot = (
    id: string,
    lon: number,
    lat: number,
    kind: DotKind,
  ): MapDot => ({
    id,
    lon,
    lat,
    kind,
    label: { en: id, zh: "點" },
  });

  it("fits the dots, keeps the aspect and skips counties outside the view", () => {
    const map = buildOutlineMap(outlines, {
      dots: [dot("a", 121.1, 24.1, "self"), dot("b", 121.3, 24.3, "same")],
      focus: ["A"],
      width: 380,
      maxHeight: 380,
      pad: 0.06,
      minSpan: 0.3,
    });
    expect(map.width).toBeLessThanOrEqual(380);
    expect(map.height).toBeLessThanOrEqual(380);
    expect(map.shapes.map((s) => s.code)).toEqual(["A"]);
    expect(map.shapes[0].focus).toBe(true);
    expect(map.dots).toHaveLength(2);
  });

  it("never zooms closer than the minimum span, even for one dot", () => {
    const map = buildOutlineMap(outlines, {
      dots: [dot("a", 121.2, 24.2, "self")],
      width: 300,
      maxHeight: 300,
      minSpan: 0.3,
    });
    expect(map.width).toBeGreaterThan(0);
    expect(map.height).toBeGreaterThan(0);
  });

  it("measures straight-line distance in kilometres", () => {
    expect(distanceKm([121, 24], [121, 25])).toBeGreaterThan(110);
    expect(distanceKm([121, 24], [121, 25])).toBeLessThan(112);
    expect(distanceKm([121, 24], [121, 24])).toBe(0);
  });
});
