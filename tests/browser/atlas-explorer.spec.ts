import { expect, test, type Page } from "@playwright/test";
import type { AtlasCollection, AtlasDataset } from "../../src/lib/atlas-types";

type MapLayer = {
  dataset: AtlasDataset;
  collection: AtlasCollection;
  total: number;
  status: string;
};
type MapResponse = { layers: MapLayer[]; errors: string[] };

async function openLayers(page: Page) {
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await page.getByText("More layers", { exact: true }).click();
  await expect(
    page.getByText("Wildlife observations", { exact: true }),
  ).toBeVisible();
}

async function enableLayer(page: Page, name: string, id: string) {
  const response = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/atlas/map" &&
      (url.searchParams.get("layers") || "").split(",").includes(id) &&
      response.ok()
    );
  });
  await page.getByRole("switch", { name, exact: true }).click();
  const body = (await (await response).json()) as MapResponse;
  expect(body.layers.some((layer) => layer.dataset.id === id)).toBe(true);
  expect(body.errors).not.toContain(id);
  await expect(page.getByRole("switch", { name, exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  return body.layers.find((layer) => layer.dataset.id === id)!;
}

test("catalogue and viewport API return real datasets across all five sections", async ({
  request,
}) => {
  const catalogue = await request.get("/api/atlas");
  await expect(catalogue).toBeOK();
  const { datasets } = (await catalogue.json()) as { datasets: AtlasDataset[] };
  expect(new Set(datasets.map((dataset) => dataset.section))).toEqual(
    new Set(["environment", "forests", "wildlife", "culture", "urban"]),
  );
  expect(
    datasets.find((dataset) => dataset.id === "landcover-2013"),
  ).toMatchObject({ status: "unavailable", recordCount: 0, file: null });

  const ids = [
    "river-quality",
    "landcover-2023",
    "wildlife",
    "villages",
    "public-historic-trails",
    "taipei-parks",
    "taipei-park-trees",
    "taipei-riverside-trees",
  ];
  const response = await request.get("/api/atlas/map", {
    params: { layers: ids.join(","), bbox: "117.8,21.7,122.3,26.6" },
  });
  await expect(response).toBeOK();
  const body = (await response.json()) as MapResponse;
  expect(body.layers.map((layer) => layer.dataset.id).sort()).toEqual(
    [...ids].sort(),
  );
  for (const layer of body.layers) {
    expect(layer.collection.type).toBe("FeatureCollection");
    expect(layer.dataset.sourceUrl).toMatch(/^https:\/\//);
    expect(layer.dataset.licence).toBeTruthy();
    expect([
      "historical-only",
      "stale",
      "unavailable",
      "not-configured",
    ]).toContain(layer.status);
    if (layer.dataset.id !== "river-quality") {
      expect(layer.total).toBeGreaterThan(0);
      expect(layer.collection.features.length).toBeGreaterThan(0);
      expect(body.errors).not.toContain(layer.dataset.id);
    } else if (["unavailable", "not-configured"].includes(layer.status)) {
      expect(layer.collection.features).toHaveLength(0);
      expect(body.errors).toContain("river-quality");
    }
  }
});

test("wildlife filters use observed dates and species without hiding undated culture layers", async ({
  request,
}) => {
  const speciesResponse = await request.get(
    "/data/atlas/wildlife.species.json",
  );
  await expect(speciesResponse).toBeOK();
  const index = (await speciesResponse.json()) as {
    species: { id: string; yearCounts: Record<string, number> }[];
  };
  const species = index.species.find((item) => item.yearCounts["2017"] > 0)!;
  expect(species).toBeDefined();
  const params = { layers: "wildlife,villages,public-historic-trails" };
  const baselineResponse = await request.get("/api/atlas/map", { params });
  await expect(baselineResponse).toBeOK();
  const baseline = (await baselineResponse.json()) as MapResponse;
  const filteredResponse = await request.get("/api/atlas/map", {
    params: {
      ...params,
      start: "2017-01-01",
      end: "2017-12-31",
      species: species.id,
    },
  });
  await expect(filteredResponse).toBeOK();
  const filtered = (await filteredResponse.json()) as MapResponse;
  expect(filtered.errors).toEqual([]);
  const wildlife = filtered.layers.find(
    (layer) => layer.dataset.id === "wildlife",
  )!;
  expect(wildlife.total).toBe(species.yearCounts["2017"]);
  expect(wildlife.total).toBeLessThan(
    baseline.layers.find((layer) => layer.dataset.id === "wildlife")!.total,
  );
  for (const id of ["villages", "public-historic-trails"])
    expect(
      filtered.layers.find((layer) => layer.dataset.id === id)?.total,
    ).toBe(baseline.layers.find((layer) => layer.dataset.id === id)?.total);
  const invalidFilters: Record<string, string>[] = [
    { bbox: "123,26,120,22" },
    { start: "2017-01-01", end: "2016-01-01" },
    { county: "not-a-county" },
  ];
  for (const params of invalidFilters)
    expect(
      (
        await request.get("/api/atlas/map", {
          params: { layers: "wildlife", ...params },
        })
      ).status(),
    ).toBe(400);
});

test("record dates filter tree inventories and forest years while preserving undated layers", async ({
  request,
}) => {
  const params = {
    layers: "taipei-park-trees,villages,public-historic-trails,taipei-parks",
  };
  const baselineResponse = await request.get("/api/atlas/map", { params });
  await expect(baselineResponse).toBeOK();
  const baseline = (await baselineResponse.json()) as MapResponse;
  const filteredResponse = await request.get("/api/atlas/map", {
    params: {
      ...params,
      start: "2023-08-07",
      end: "2023-08-07",
      species: "not-a-tree-species",
    },
  });
  await expect(filteredResponse).toBeOK();
  const filtered = (await filteredResponse.json()) as MapResponse;
  expect(filtered.errors).toEqual([]);
  const trees = filtered.layers.find(
    (layer) => layer.dataset.id === "taipei-park-trees",
  )!;
  expect(trees.total).toBeGreaterThan(0);
  expect(trees.total).toBeLessThan(
    baseline.layers.find((layer) => layer.dataset.id === "taipei-park-trees")!
      .total,
  );
  for (const feature of trees.collection.features.filter(
    (feature) => !feature.properties.aggregated,
  ))
    expect(feature.properties.date).toBe("2023-08-07");
  for (const id of ["villages", "public-historic-trails", "taipei-parks"])
    expect(
      filtered.layers.find((layer) => layer.dataset.id === id)?.total,
    ).toBe(baseline.layers.find((layer) => layer.dataset.id === id)?.total);

  const forestResponse = await request.get("/api/atlas/map", {
    params: {
      layers: "landcover-2023",
      start: "2017-01-01",
      end: "2017-12-31",
    },
  });
  await expect(forestResponse).toBeOK();
  const forest = ((await forestResponse.json()) as MapResponse).layers[0];
  expect(forest.total).toBe(0);
  expect(forest.collection.features).toHaveLength(0);
  expect(forest.dataset.raster).toBeUndefined();
});

test("real forest rasters and all thematic switches preserve the central map canvas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openLayers(page);
  const canvas = await page.locator("canvas.maplibregl-canvas").elementHandle();
  await page
    .getByRole("switch", { name: "Weather stations", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Weather stations", exact: true }),
  ).toHaveAttribute("aria-checked", "true");

  const image = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/data/atlas/landcover-2023.png" &&
      response.ok(),
  );
  const forest = await enableLayer(
    page,
    "2023 land-cover classes",
    "landcover-2023",
  );
  expect(forest.dataset.raster?.coordinates).toHaveLength(4);
  await expect(
    page.getByRole("group", { name: "Historical record filters" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Wildlife species" }),
  ).toHaveCount(0);
  await image;
  await expect(page.locator(".map-legend")).toContainText(
    "2023 land-cover classes",
  );
  await page.getByRole("button", { name: "Toggle layers panel" }).click();
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("atlas-forest-central-map.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Toggle layers panel" }).click();
  await enableLayer(page, "2023 mapped forest", "forest-cover-2023");
  await expect(
    page.getByRole("switch", { name: "2023 land-cover classes", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByRole("switch", { name: /2013 comparison/ }),
  ).toHaveCount(0);

  await enableLayer(page, "Roadkill archive · public subset", "wildlife");
  const style = page.getByRole("combobox", {
    name: "Additional point-layer style",
  });
  await style.selectOption("heatmap");
  await expect(style).toHaveValue("heatmap");
  await style.selectOption("clusters");
  await enableLayer(page, "Indigenous village reference points", "villages");
  const trails = await enableLayer(
    page,
    "Public historical trail routes",
    "public-historic-trails",
  );
  expect(
    trails.collection.features.some(
      (feature) =>
        feature.geometry.type === "LineString" ||
        feature.geometry.type === "MultiLineString",
    ),
  ).toBe(true);
  await enableLayer(
    page,
    "Taipei parks, squares and green spaces",
    "taipei-parks",
  );
  const trees = await enableLayer(
    page,
    "Taipei public park tree inventory",
    "taipei-park-trees",
  );
  await enableLayer(
    page,
    "Taipei riverside tree survey",
    "taipei-riverside-trees",
  );
  const datedResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/atlas/map" &&
      url.searchParams.get("start") === "2023-08-07" &&
      url.searchParams.get("end") === "2023-08-07" &&
      response.ok()
    );
  });
  await page.getByLabel("Record date from", { exact: true }).fill("2023-08-07");
  await page
    .getByLabel("Record date through", { exact: true })
    .fill("2023-08-07");
  const dated = (await (await datedResponse).json()) as MapResponse;
  expect(dated.errors).toEqual([]);
  const datedTrees = dated.layers.find(
    (layer) => layer.dataset.id === "taipei-park-trees",
  )!;
  expect(datedTrees.total).toBeGreaterThan(0);
  expect(datedTrees.total).toBeLessThan(trees.total);
  expect(
    dated.layers.find((layer) => layer.dataset.id === "public-historic-trails")
      ?.total,
  ).toBe(trails.total);
  expect(
    await canvas?.evaluate(
      (node) => node === document.querySelector("canvas.maplibregl-canvas"),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("selected overlay record search opens real provenance and mobile controls reflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openLayers(page);
  await enableLayer(
    page,
    "Public historical trail routes",
    "public-historic-trails",
  );
  const search = page.getByRole("textbox", {
    name: "Search counties or station names",
  });
  await search.fill("礁溪跑馬古道");
  const result = page
    .locator(".search-results")
    .getByRole("button", { name: /礁溪跑馬古道/ });
  await expect(result).toBeVisible();
  await expect(result).toContainText("Public historical trail routes");
  await result.click();
  await expect(page.locator(".maplibregl-popup h3")).toHaveText("礁溪跑馬古道");
  await expect(page.locator(".maplibregl-popup")).toContainText("Licence");
  await expect(
    page.locator(".maplibregl-popup").getByRole("link"),
  ).toHaveAttribute("href", "/culture?dataset=public-historic-trails");
  await page.getByRole("tab", { name: "Data details", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Public historical trail routes",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: /Layers/ }).click();
  await page.getByText("More layers", { exact: true }).click();
  await expect(
    page.getByRole("switch", {
      name: "Public historical trail routes",
      exact: true,
    }),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("atlas-layer-controls-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
