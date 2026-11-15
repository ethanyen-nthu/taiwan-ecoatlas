import { expect, test } from "@playwright/test";
test("real county map initializes, controls toggle without replacing the canvas, and counties filter", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Select county" }).locator("option"),
  ).toHaveCount(23);
  const canvas = await page.locator("canvas.maplibregl-canvas").elementHandle();
  await page.getByRole("switch", { name: "County boundaries" }).click();
  await expect(
    page.getByRole("switch", { name: "County boundaries" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("switch", { name: "County boundaries" }).click();
  await page.getByRole("switch", { name: "Weather stations" }).click();
  await expect(
    page.getByRole("switch", { name: "Weather stations" }),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    await canvas?.evaluate(
      (node) => node === document.querySelector("canvas.maplibregl-canvas"),
    ),
  ).toBe(true);
  await page
    .getByRole("combobox", { name: "Select county" })
    .selectOption("09020");
  await expect(page.locator(".map-insight h2")).toHaveText("Kinmen County");
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(
    page.getByRole("combobox", { name: "Select county" }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByRole("switch", { name: "縣市界線" })).toBeVisible();
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  await page.screenshot({
    path: "test-results/explorer-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
test("no-key APIs and invalid requests are safe and explicit", async ({
  request,
}) => {
  for (const kind of ["aqi", "weather"]) {
    const result = await request.get(`/api/observations/${kind}`);
    expect(result.status()).toBe(200);
    expect(await result.json()).toMatchObject({
      status: "not-configured",
      observations: [],
      retrievedAt: null,
    });
  }
  expect((await request.get("/api/observations/unknown")).status()).toBe(404);
  expect(
    (await request.get("/api/observations/aqi?bbox=25,121,24,120")).status(),
  ).toBe(400);
  expect((await request.post("/api/ingest")).status()).toBe(503);
});
test("mobile controls and bilingual navigation remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Select county" })
    .selectOption("09007");
  await page.getByRole("button", { name: "Toggle layers panel" }).click();
  await expect(page.locator(".explorer-panel")).toHaveClass(/collapsed/);
  await expect(
    page.getByRole("button", { name: "Reset Taiwan map" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/explorer-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Environment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Our shared environment." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("basemap failure keeps the official map usable and source states honest", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(page.locator(".map-warning")).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "County boundaries" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Data details" }).click();
  await expect(page.getByText("Not configured", { exact: true })).toHaveCount(
    2,
  );
});
test("date filter only filters actual latest observations and popup retains provenance", async ({
  page,
}) => {
  // Explicit synthetic fixture, isolated to this test route. Never used by the application.
  const observedAt = new Date().toISOString();
  await page.route("**/api/observations/aqi", (route) =>
    route.fulfill({
      json: {
        source: "aqi",
        status: "fresh",
        lastObservationAt: observedAt,
        publishedAt: observedAt,
        retrievedAt: observedAt,
        checkedAt: observedAt,
        excluded: 0,
        duplicates: 0,
        message: null,
        observations: [
          {
            id: "BROWSER-TEST",
            source: "aqi",
            station: "Synthetic browser test station",
            county: "臺北市",
            longitude: 121.514,
            latitude: 25.046,
            observedAt,
            publishedAt: observedAt,
            status: "良好",
            values: {
              aqi: 42,
              pm25: null,
              pm10: null,
              o3: null,
              no2: null,
              so2: null,
              co: null,
            },
          },
        ],
      },
    }),
  );
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(page.locator(".insight-metrics strong").first()).toHaveText("1");
  await page.locator(".panel-date-filter input").fill("2000-01-01");
  await expect(page.locator(".insight-metrics strong").first()).toHaveText("0");
  await expect(
    page.getByRole("switch", { name: "County boundaries" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.locator(".panel-date-filter button").click();
  await page
    .getByRole("combobox", { name: "Select county" })
    .selectOption("63000");
  await expect(page.locator(".insight-metrics strong").first()).toHaveText("1");
  await page
    .getByRole("textbox", { name: "Search counties or station names" })
    .fill("Synthetic browser test");
  await page
    .getByRole("button", {
      name: "Synthetic browser test station",
      exact: true,
    })
    .click();
  await expect(page.locator(".maplibregl-popup h3")).toHaveText(
    "Synthetic browser test station",
  );
  await expect(page.locator(".maplibregl-popup")).toContainText("AQX_P_432");
  await expect(page.locator(".maplibregl-popup")).toContainText(
    "Last retrieval",
  );
  await expect(page.locator(".maplibregl-popup")).toContainText(
    "Open Government Data License 1.0",
  );
});
test("homepage, source registry and all theme routes render on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One island. Many perspectives." }),
  ).toBeVisible();
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const route of [
    "/environment",
    "/forests",
    "/wildlife",
    "/culture",
    "/urban",
    "/data",
    "/about",
    "/sources",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
  }
  await expect(page.getByText("Not configured", { exact: true })).toHaveCount(
    2,
  );
  await page.screenshot({
    path: "test-results/sources-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
