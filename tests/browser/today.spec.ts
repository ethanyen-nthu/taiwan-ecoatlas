import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Every figure here is synthetic and exists only in these tests' network
// mocks. The application never uses it.
const at = "2026-11-26T07:00:00.000Z";
const summary = {
  checkedAt: at,
  air: {
    status: "fresh",
    stations: 84,
    reporting: 62,
    medianAqi: 54,
    band: "普通",
    bandEnglish: "Moderate",
    latest: at,
  },
  weather: {
    status: "fresh",
    stations: 874,
    medianTemperature: 21.9,
    warmest: { value: 26.6, station: "Alpha", county: "屏東縣" },
    coolest: { value: 3.2, station: "Bravo", county: "南投縣" },
    rainReporting: 861,
    raining: 312,
    latest: at,
  },
  reservoirs: {
    status: "fresh",
    large: 17,
    percent: 88.8,
    lowest: { nameEn: "Wushe Reservoir", nameZh: "霧社水庫", percent: 43.7 },
    latest: at,
  },
};
const nothing = {
  checkedAt: at,
  air: {
    ...summary.air,
    status: "not-configured",
    reporting: 0,
    stations: 0,
    medianAqi: null,
    band: null,
    bandEnglish: null,
    latest: null,
  },
  weather: {
    ...summary.weather,
    status: "unavailable",
    stations: 0,
    medianTemperature: null,
    warmest: null,
    coolest: null,
    rainReporting: 0,
    raining: 0,
    latest: null,
  },
  reservoirs: {
    ...summary.reservoirs,
    status: "unavailable",
    large: 0,
    percent: null,
    lowest: null,
    latest: null,
  },
};

const mock = (page: Page, body: unknown, status = 200) =>
  page.route("**/api/today", (route) =>
    route.fulfill({ status, json: body as object }),
  );
const bar = (page: Page) => page.locator('[data-today="bar"]');
const hero = (page: Page) => page.locator('[data-today="hero"]');

test("home: four figures sit beside the map, each linking to its page", async ({
  page,
}) => {
  await mock(page, summary);
  await page.goto("/");
  const panel = hero(page);
  await expect(
    panel.getByRole("heading", { name: "Today in Taiwan" }),
  ).toBeVisible();
  const items = panel.locator(".hero-today-grid li");
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText("Air quality (AQI)");
  await expect(items.nth(0)).toContainText("54");
  await expect(items.nth(0)).toContainText("Moderate");
  await expect(items.nth(0)).toContainText("the middle of 62 stations");
  await expect(items.nth(1)).toContainText("21.9");
  await expect(items.nth(1)).toContainText("°C");
  await expect(items.nth(1)).toContainText("3.2–26.6 °C");
  await expect(items.nth(2)).toContainText("312");
  await expect(items.nth(2)).toContainText("of 861 stations");
  await expect(items.nth(3)).toContainText("88.8");
  await expect(items.nth(3)).toContainText("% full");
  await expect(items.nth(3)).toContainText("lowest Wushe Reservoir at 43.7%");
  const hrefs = await items
    .locator("a")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(hrefs).toEqual([
    "/environment",
    "/environment/weather",
    "/environment/weather",
    "/environment/reservoirs",
  ]);
  // The reservoir figure is plain: no colour dot, only the air figure has one.
  await expect(items.locator(".today-dot")).toHaveCount(1);
  await expect(items.nth(0).locator(".today-dot")).toHaveCount(1);
  // The source statuses are still there, with reservoirs and the two hazard feeds added.
  await expect(panel.locator(".hero-sources dt")).toHaveText([
    "Air quality · MOENV",
    "Weather · CWA",
    "Reservoirs · WRA",
    "Earthquakes · CWA",
    "Cyclones · CWA",
  ]);
  // The map is still beside it, and the strip is not repeated on this page.
  await expect(page.locator(".hero-map")).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
  const box = (await panel.boundingBox())!;
  const map = (await page.locator(".hero-map").boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(map.x + 1);
});

test("other pages: a slim strip under the header, linking to the live pages", async ({
  page,
}) => {
  await mock(page, summary);
  await page.goto("/culture/peoples");
  const strip = bar(page);
  await expect(strip).toBeVisible();
  await expect(strip).toContainText("Today");
  await expect(strip.getByRole("link")).toHaveCount(4);
  await expect(strip.getByRole("link").nth(0)).toHaveAccessibleName(
    /Air quality \(AQI\) 54 Moderate/,
  );
  await expect(
    strip.getByRole("link", { name: /Reservoir storage 88\.8/ }),
  ).toHaveAttribute("href", "/environment/reservoirs");
  // It sits between the header and the page, in the page flow.
  const header = (await page.locator("header.site-header").boundingBox())!;
  const top = (await strip.boundingBox())!;
  const main = (await page.locator("main").boundingBox())!;
  expect(top.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(main.y).toBeGreaterThanOrEqual(top.y + top.height - 1);
  await strip.getByRole("link", { name: /Reservoir storage/ }).click();
  await expect(page).toHaveURL(/\/environment\/reservoirs$/);
});

test("the strip stays off the home page and the full-screen map", async ({
  page,
}) => {
  await mock(page, summary);
  await page.goto("/explore");
  await expect(page.locator("main")).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
});

test("when the summary fails, the strip is not shown and the page still works", async ({
  page,
}) => {
  await mock(page, { error: "down" }, 500);
  await page.goto("/culture/peoples");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sixteen peoples",
  );
  await expect(bar(page)).toHaveCount(0);
  await page.goto("/");
  await expect(hero(page).locator(".hero-today-grid")).toHaveCount(0);
  await expect(hero(page)).toContainText("No live readings right now");
  await expect(hero(page).locator(".hero-sources dt")).toHaveCount(5);
});

test("a feed with nothing shows nothing, never zeros", async ({ page }) => {
  await mock(page, nothing);
  await page.goto("/culture/peoples");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
  await page.goto("/");
  await expect(hero(page).locator(".hero-today-grid")).toHaveCount(0);
  await expect(hero(page)).not.toContainText(/\b0\.0\b|NaN|undefined/);
});

test("one feed missing leaves the others", async ({ page }) => {
  await mock(page, { ...summary, air: nothing.air });
  await page.goto("/culture/peoples");
  await expect(bar(page).getByRole("link")).toHaveCount(3);
  await expect(bar(page)).not.toContainText("Air quality");
});

test("an older reading says so", async ({ page }) => {
  await mock(page, {
    ...summary,
    weather: { ...summary.weather, status: "stale" },
  });
  await page.goto("/culture/peoples");
  await expect(
    bar(page).getByRole("link", { name: /Temperature/ }),
  ).toContainText("older reading");
  await expect(
    bar(page).getByRole("link", { name: /Reservoir/ }),
  ).not.toContainText("older reading");
});

test("Chinese labels in the strip and on the home page", async ({ page }) => {
  await mock(page, summary);
  await page.goto("/");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  const panel = hero(page);
  await expect(
    panel.getByRole("heading", { name: "此刻的臺灣" }),
  ).toBeVisible();
  await expect(panel).toContainText("空氣品質（AQI）");
  await expect(panel).toContainText("普通");
  await expect(panel).toContainText("874 個測站的中間值，範圍 3.2–26.6 °C");
  await expect(panel).toContainText("／861 個測站");
  await expect(panel).toContainText("最低為霧社水庫（43.7%）");
  await page.goto("/culture/peoples");
  await expect(bar(page)).toContainText("今日");
  await expect(bar(page).getByRole("link", { name: /水庫蓄水/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/undefined|NaN/);
});

for (const path of ["/", "/culture/peoples", "/environment/weather"]) {
  test(`${path}: passes WCAG checks and fits at 1440, 390 and 320 px`, async ({
    page,
  }) => {
    await mock(page, summary);
    await page.route("**/api/observations/*", (route) =>
      route.fulfill({
        json: {
          source: "x",
          status: "not-configured",
          observations: [],
          lastObservationAt: null,
          publishedAt: null,
          retrievedAt: null,
          checkedAt: at,
          excluded: 0,
          duplicates: 0,
          message: "CWA_API_KEY",
        },
      }),
    );
    for (const size of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
      { width: 320, height: 700 },
    ]) {
      await page.setViewportSize(size);
      await page.goto(path);
      await expect(
        page.locator(
          path === "/"
            ? '[data-today="hero"] .hero-today-grid'
            : '[data-today="bar"] ul',
        ),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        `${path} at ${size.width}px`,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
        `overflow at ${size.width}px`,
      ).toBeLessThanOrEqual(0);
    }
  });
}

test("on a phone the figures come before the map", async ({ page }) => {
  await mock(page, summary);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const panel = (await hero(page).boundingBox())!;
  const map = (await page.locator(".hero-map").boundingBox())!;
  expect(panel.y + panel.height).toBeLessThanOrEqual(map.y + 1);
});
