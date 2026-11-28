import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// The service worker is what is under test here, so it is switched back on
// (playwright.config.ts blocks it for every other spec). Figures are
// synthetic and exist only in these mocks.
test.use({ serviceWorkers: "allow" });

const at = "2026-11-26T07:00:00.000Z";
const today = {
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
const dataset = (source: string) => ({
  source,
  status: "fresh",
  observations: [],
  lastObservationAt: at,
  publishedAt: at,
  retrievedAt: at,
  checkedAt: at,
  excluded: 0,
  duplicates: 0,
  message: null,
});

/** Answers the live feeds from the test, and gives each test one switch for
 *  "no connection". Playwright's own offline mode is not used: a mocked
 *  response would still be delivered while "offline". A context-level route is
 *  used because it also sees the requests the worker itself makes, which is
 *  where the worker asks the network. The last route added runs first, so the
 *  switch is added last. */
async function connection(context: BrowserContext) {
  await context.route("**/api/today", (route) =>
    route.fulfill({ json: today }),
  );
  await context.route("**/api/observations/aqi", (route) =>
    route.fulfill({ json: dataset("moenv") }),
  );
  await context.route("**/api/observations/weather", (route) =>
    route.fulfill({ json: dataset("cwa") }),
  );
  const state = { online: true };
  await context.route("**/*", (route) =>
    state.online ? route.fallback() : route.abort("internetdisconnected"),
  );
  return {
    offline: () => {
      state.online = false;
    },
    online: async (page: Page) => {
      state.online = true;
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
    },
  };
}

const controlled = (page: Page) =>
  page.waitForFunction(
    () =>
      !!navigator.serviceWorker.controller &&
      navigator.serviceWorker.controller.state === "activated",
  );
const saved = (page: Page, name: string) =>
  page.evaluate(async (name) => {
    const cache = await caches.open(name);
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  }, name);

test("the manifest, its icons and the head links make the site installable", async ({
  page,
  request,
}) => {
  await page.goto("/about");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#f8f5f1",
  );
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: expect.stringContaining("Taiwan EcoAtlas"),
    short_name: "EcoAtlas",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f5f1",
  });
  const purposes = manifest.icons.map(
    (icon: { purpose?: string }) => icon.purpose ?? "any",
  );
  expect(purposes).toContain("any");
  expect(purposes).toContain("maskable");
  for (const icon of manifest.icons as {
    src: string;
    sizes: string;
    type: string;
  }[]) {
    const file = await request.get(icon.src);
    expect(file.ok(), icon.src).toBe(true);
    expect(file.headers()["content-type"]).toContain(icon.type);
    const bytes = await file.body();
    // A PNG's width and height sit in the header, big-endian.
    const [width] = icon.sizes.split("x").map(Number);
    expect(bytes.readUInt32BE(16)).toBe(width);
    expect(bytes.readUInt32BE(20)).toBe(width);
  }
  for (const shortcut of manifest.shortcuts as { url: string }[]) {
    expect((await request.get(shortcut.url)).ok(), shortcut.url).toBe(true);
  }
});

test("the worker file is never cached and may control the whole site", async ({
  request,
}) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBe(true);
  const headers = response.headers();
  expect(headers["cache-control"]).toContain("no-store");
  expect(headers["service-worker-allowed"]).toBe("/");
  expect(headers["content-type"]).toContain("javascript");
});

test("a page that was opened still opens with no connection, and one never opened says so", async ({
  page,
  context,
}) => {
  const net = await connection(context);
  await page.goto("/about");
  await controlled(page);
  // The worker keeps a page it handled, so open it once under the worker.
  await page.goto("/about");
  await expect.poll(() => saved(page, "ecoatlas-pages-v1")).toContain("/about");
  expect(await saved(page, "ecoatlas-pages-v1")).toContain("/offline");

  net.offline();
  await page.goto("/about");
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    "not saved on this device",
  );

  await page.goto("/county/63000/never-opened-here");
  // Sent to the offline page, with the page that was wanted in its address.
  await expect(page).toHaveURL(/\/offline\?from=/);
  await expect(page.locator("h1")).toContainText("not saved on this device");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  // With the connection back, "Try again" goes to the page that was wanted.
  await net.online(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page).toHaveURL(/\/county\/63000\/never-opened-here$/);
});

test("following a link to a page never opened, with no connection, lands on the offline page", async ({
  page,
  context,
}) => {
  const net = await connection(context);
  await page.goto("/about");
  await controlled(page);
  await page.goto("/about");
  await expect.poll(() => saved(page, "ecoatlas-pages-v1")).toContain("/about");
  net.offline();
  await page.locator('nav a[href="/forests"]').first().click();
  await expect(page).toHaveURL(/\/offline\?from=%2Fforests/);
  await expect(page.locator("h1")).toContainText("not saved on this device");
  await net.online(page);
});

test("home: with no connection the figures are the saved copy, marked with its time, and it clears when the connection returns", async ({
  page,
  context,
}) => {
  const net = await connection(context);
  await page.goto("/");
  await controlled(page);
  // Under the worker now: a reload sends the feeds through it, which saves them.
  await page.reload();
  await expect
    .poll(() => saved(page, "ecoatlas-data-v1"))
    .toEqual(expect.arrayContaining(["/api/today", "/api/observations/aqi"]));
  const hero = page.locator('[data-today="hero"]');
  await expect(hero.locator("[data-saved-copy]")).toHaveCount(0);
  await expect(hero).toContainText("Moderate");

  net.offline();
  await page.reload();
  const notice = hero.locator("[data-saved-copy]");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("saved on this device");
  // The page stays up: a missing lazy file may replace the map with a note,
  // but it must not take the readings with it. (The first look is not enough,
  // because a failing file is only found a moment after the page paints.)
  await page.waitForTimeout(1500);
  await expect(notice).toBeVisible();
  await expect(page.getByText("This view could not be loaded")).toHaveCount(0);
  await expect(notice).toContainText("not live");
  // The figures are the saved ones, and no feed claims to be fresh.
  await expect(hero).toContainText("Moderate");
  await expect(hero).toContainText("88.8");
  await expect(hero.locator(".status-fresh")).toHaveCount(0);
  await expect(hero.locator(".status-stale").first()).toContainText(
    "Saved copy",
  );
  // Each feed names the time of its newest reading.
  await expect(hero.locator(".source-time time").first()).toHaveAttribute(
    "datetime",
    at,
  );

  await net.online(page);
  await expect(hero.locator("[data-saved-copy]")).toHaveCount(0);
  await expect(hero.locator(".status-fresh").first()).toBeVisible();
});

test("the strip on other pages also says it is a saved copy", async ({
  page,
  context,
}) => {
  const net = await connection(context);
  await page.goto("/about");
  await controlled(page);
  await page.reload();
  await expect
    .poll(() => saved(page, "ecoatlas-data-v1"))
    .toContain("/api/today");
  net.offline();
  await page.reload();
  const bar = page.locator('[data-today="bar"]');
  await expect(bar).toContainText("saved copy, not live");
  await expect(bar).toContainText("Moderate");
  await net.online(page);
});

test("Chinese: the notice and the offline page read in Traditional Chinese", async ({
  page,
  context,
}) => {
  const net = await connection(context);
  await page.goto("/");
  await page.getByRole("button", { name: "繁中" }).click();
  await controlled(page);
  await page.reload();
  await expect
    .poll(() => saved(page, "ecoatlas-data-v1"))
    .toContain("/api/today");
  net.offline();
  await page.reload();
  await expect(
    page.locator('[data-today="hero"] [data-saved-copy]'),
  ).toContainText("並非即時");
  await page.goto("/county/63000/never-opened-here");
  await expect(page.locator("h1")).toContainText("尚未儲存");
  await net.online(page);
});
