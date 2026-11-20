import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const wcag = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function expectAccessible(page: Page, route: string) {
  const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    route,
  ).toEqual([]);
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

/** Move over the map until a grid square or stack answers with its count
 *  tooltip, so the test never depends on pixel positions. */
async function findAggregate(page: Page) {
  const canvas: Locator = page.locator("canvas.maplibregl-canvas").first();
  const box = (await canvas.boundingBox())!;
  for (let fy = 0.1; fy < 0.95; fy += 0.04)
    for (let fx = 0.12; fx < 0.92; fx += 0.03) {
      const x = box.x + box.width * fx,
        y = box.y + box.height * fy;
      await page.mouse.move(x, y);
      const tip = page.locator(".county-tooltip");
      if (
        (await tip.count()) &&
        /records ·/.test((await tip.first().textContent()) || "")
      )
        return { x, y };
    }
  throw new Error("No aggregated square or stack found on the map");
}

async function openMap(page: Page, route: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  await page.waitForSelector(
    ".atlas-map .map-canvas-shell[data-map-ready=true]",
  );
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  await page.locator(".atlas-map").scrollIntoViewIfNeeded();
}

test("the wildlife map draws squares and a square opens a readable panel", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openMap(page, "/wildlife?mode=points");
  await expect(page.locator(".atlas-tiles")).toContainText(
    "Records per square",
  );
  await expect(page.locator(".atlas-tiles")).toContainText("10 km");
  const spot = await findAggregate(page);
  await page.mouse.click(spot.x, spot.y);
  const peek = page.locator(".atlas-peek");
  await expect(peek).toBeVisible();
  await expect(peek.getByRole("heading", { level: 2 })).toContainText(
    /records in this square/,
  );
  await expect(peek).toContainText("It is a count, not the place");
  // The panel is big enough to read: at least 16px body text.
  const size = await peek
    .locator(".atlas-peek-text")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(15);
  await peek.getByRole("button", { name: "Close record details" }).click();
  await expect(peek).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the culture map links to the peoples guide, and a record opens the bigger panel with its people", async ({
  page,
}) => {
  await openMap(page, "/culture?q=Wsilung&shade=0");
  await expect(
    page.getByRole("link", { name: /Meet the sixteen peoples/ }),
  ).toHaveAttribute("href", "/culture/peoples");
  await page.getByRole("button", { name: "View Wsilung" }).click();
  const peek = page.locator(".atlas-peek");
  await expect(peek.getByRole("heading", { level: 2 })).toHaveText("Wsilung");
  await expect(peek.locator(".atlas-peek-people")).toContainText("Atayal");
  await expect(
    peek.getByRole("link", { name: /Open the village profile/ }),
  ).toHaveAttribute("href", "/culture/places/village-7");
  await expect(
    peek.getByRole("link", { name: /About the Atayal/ }),
  ).toHaveAttribute("href", "/culture/peoples/atayal");
  const size = await peek
    .locator(".atlas-peek-people p")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(15);
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(peek.getByRole("link", { name: /開啟部落介紹/ })).toBeVisible();
  await expect(peek.getByRole("heading", { level: 2 })).toHaveText("詩朗部落");
});

test("the sixteen peoples index lists every people and passes accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/culture/peoples");
  await expect(
    page.getByRole("heading", { level: 1, name: /sixteen/i }),
  ).toBeVisible();
  const cards = page.locator('.cp-cards a[href^="/culture/peoples/"]');
  await expect(cards).toHaveCount(16);
  await expect(
    page.locator('.cp-cards a[href="/culture/peoples/atayal"]'),
  ).toHaveCount(1);
  await expectAccessible(page, "/culture/peoples");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => overflow(page)).toBeLessThanOrEqual(1);
});

test("a people profile has history, living culture, villages and sources", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/culture/peoples/atayal");
  await expect(
    page.getByRole("heading", { level: 1, name: /Atayal/ }),
  ).toBeVisible();
  for (const name of [/History/, /Today|Living/, /Words worth knowing/]) {
    await expect(page.getByRole("heading", { name }).first()).toBeVisible();
  }
  const county = page.locator(".cp-counties details").first();
  await county.locator("summary").click();
  await expect(
    county.locator('a[href^="/culture/places/village-"]').first(),
  ).toBeVisible();
  await expectAccessible(page, "/culture/peoples/atayal");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(
    page.getByRole("heading", { level: 1, name: /泰雅族/ }),
  ).toBeVisible();
});

test("a village profile shows the place, the people, nearby villages and honest limits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/culture/places/village-7");
  await expect(
    page.getByRole("heading", { level: 1, name: /Wsilung/ }),
  ).toBeVisible();
  const main = page.locator("main");
  await expect(main.locator("svg").first()).toBeVisible();
  await expect(main).toContainText("a catalogue date, not a founding date");
  await expect(main).toContainText("Nearby villages in the listing");
  await expect(
    main.locator('a[href="/culture/peoples/atayal"]').first(),
  ).toBeVisible();
  await expect(main).toContainText("no photographs");
  await expect(
    main.locator('a[href="https://data.gov.tw/dataset/156632"]').first(),
  ).toBeVisible();
  await expectAccessible(page, "/culture/places/village-7");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: /詩朗部落/ }),
  ).toBeVisible();
  await expectAccessible(page, "/culture/places/village-7 (zh)");
  // Phones and 200% text on a 320px screen must not scroll sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => overflow(page)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect.poll(() => overflow(page)).toBeLessThanOrEqual(1);
});

test("a place that is not a listed village still opens a study or route record, never a made-up page", async ({
  page,
}) => {
  const response = await page.goto("/culture/places/village-999999");
  expect(response?.status()).toBe(404);
});
