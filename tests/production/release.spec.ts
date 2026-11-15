import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Counties, DatasetResponse } from "../../src/lib/types";

// Read-only release checks. No request interception, fixtures, ingestion or secret inputs.
test("public routes, bilingual content and responsive layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/explore",
      "/environment",
      "/forests",
      "/wildlife",
      "/culture",
      "/urban",
      "/data",
      "/sources",
      "/about",
    ]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("main")).toBeVisible();
      if (route === "/" || route === "/explore")
        await expect(page.locator("[data-map-ready=true]")).toBeVisible();
      await page.getByRole("button", { name: "繁中", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
      if (route === "/explore")
        await page.screenshot({
          path: `test-results/release-explore-${width}.png`,
          fullPage: true,
        });
    }
    await page.screenshot({
      path: `test-results/release-about-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("public county archive and all 22 selections remain usable", async ({
  page,
  request,
}) => {
  const response = await request.get("/data/counties.geojson");
  expect(response.status()).toBe(200);
  const bytes = await response.body();
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    createHash("sha256")
      .update(readFileSync("public/data/counties.geojson"))
      .digest("hex"),
  );
  const counties = JSON.parse(bytes.toString()) as Counties;
  expect(counties.features).toHaveLength(22);
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  for (const county of counties.features) {
    await page
      .getByRole("combobox", { name: "Select county" })
      .selectOption(county.properties.COUNTYCODE);
    await expect(page.locator(".map-insight h2")).toHaveText(
      county.properties.COUNTYENG,
    );
  }
  await page.getByRole("button", { name: "Reset view" }).click();
  for (const name of ["County boundaries", "Air quality", "Weather stations"]) {
    const control = page.getByRole("switch", { name, exact: true });
    const original = await control.getAttribute("aria-checked");
    await control.click();
    await expect(control).toHaveAttribute(
      "aria-checked",
      original === "true" ? "false" : "true",
    );
    await control.click();
  }
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  await page.screenshot({
    path: "test-results/release-map-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Toggle layers panel" }).click();
  await page.screenshot({
    path: "test-results/release-map-mobile.png",
    fullPage: true,
  });
});

for (const kind of ["aqi", "weather"] as const) {
  test(`${kind}: actual fresh provider observations reach a map popup`, async ({
    page,
    request,
  }) => {
    const response = await request.get(`/api/observations/${kind}`, {
      timeout: 65000,
    });
    expect(response.status()).toBe(200);
    const data = (await response.json()) as DatasetResponse;
    expect(
      data.status,
      `${kind} must have working credentials and recent observations`,
    ).toBe("fresh");
    expect(data.observations.length).toBeGreaterThan(0);
    expect(Date.parse(data.lastObservationAt!)).toBeGreaterThan(
      Date.now() - 2 * 3600_000,
    );
    expect(Date.parse(data.retrievedAt!)).toBeGreaterThan(
      Date.now() - 3600_000,
    );
    const valueName = kind === "aqi" ? "aqi" : "temperature";
    const station = data.observations.find(
      (o) =>
        Number.isFinite(o.values[valueName]) &&
        Date.parse(o.observedAt) > Date.now() - 2 * 3600_000,
    );
    expect(station).toBeDefined();
    for (const o of data.observations) {
      expect(o.longitude).toBeGreaterThanOrEqual(117);
      expect(o.longitude).toBeLessThanOrEqual(125);
      expect(o.latitude).toBeGreaterThanOrEqual(20);
      expect(o.latitude).toBeLessThanOrEqual(27);
      expect(Number.isFinite(Date.parse(o.observedAt))).toBe(true);
      for (const value of Object.values(o.values))
        if (value !== null) expect(Number.isFinite(value)).toBe(true);
    }
    await page.goto("/explore");
    await expect(page.locator("[data-map-ready=true]")).toBeVisible();
    await page
      .getByRole("textbox", { name: "Search counties or station names" })
      .fill(station!.station);
    await page
      .getByRole("button", {
        name: `${station!.station} · ${kind === "aqi" ? "Air quality" : "Weather"}`,
        exact: true,
      })
      .first()
      .click();
    await expect(page.locator(".maplibregl-popup h3")).toHaveText(
      station!.station,
    );
    await expect(page.locator(".maplibregl-popup")).toContainText(
      kind === "aqi" ? "AQX_P_432" : station!.source,
    );
    await expect(
      page
        .locator(".maplibregl-popup")
        .getByText(
          `${kind === "aqi" ? "AQI" : "Air temperature · °C"}: ${station!.values[valueName]}`,
          { exact: true },
        ),
    ).toBeVisible();
    console.log(
      `${kind}: ${data.observations.length} observations; latest=${data.lastObservationAt}; retrieved=${data.retrievedAt}`,
    );
  });
}

test("private local files are not publicly served", async ({ request }) => {
  for (const path of [
    "/.env.local",
    "/.env",
    "/.git/config",
    "/.vercel/project.json",
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
