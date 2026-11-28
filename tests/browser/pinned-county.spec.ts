import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Every figure here is synthetic and exists only in these tests' network
// mocks. The application never uses it.
const at = "2026-11-28T03:00:00.000Z";
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
  counties: {
    "63000": {
      air: { medianAqi: 50, band: "良好", bandEnglish: "Good", reporting: 2 },
      weather: {
        medianTemperature: 23,
        stations: 2,
        coolest: 22,
        warmest: 24,
      },
    },
  },
};
const mockToday = (page: Page) =>
  page.route("**/api/today", (route) => route.fulfill({ json: summary }));
const pinAtStart = (page: Page, value: string) =>
  page.addInitScript(
    (code) => localStorage.setItem("ecoatlas-county", code),
    value,
  );
const bar = (page: Page) => page.locator('[data-today="bar"]');

const station = (
  id: string,
  name: string,
  county: string,
  temperature: number | null,
) => ({
  id,
  source: "weather",
  station: name,
  county,
  longitude: 121,
  latitude: 24,
  observedAt: at,
  publishedAt: null,
  status: null,
  values: {
    temperature,
    rainfall: 0,
    humidity: 80,
    windSpeed: 3,
    windDirection: 90,
  },
});
const weather = {
  source: "weather",
  status: "fresh",
  lastObservationAt: at,
  publishedAt: null,
  retrievedAt: at,
  checkedAt: at,
  excluded: 0,
  duplicates: 0,
  message: null,
  observations: [
    station("a", "Alpha", "臺北市", 22),
    station("b", "Bravo", "臺北市", 24),
    station("c", "Charlie", "南投縣", 3.2),
    station("d", "Delta", "南投縣", 19),
    station("e", "Echo", "宜蘭縣", 17),
  ],
};

test("pinning a county on its page puts it first in the Today strip on other pages, and unpinning removes it", async ({
  page,
}) => {
  await mockToday(page);
  await page.goto("/county/63000");
  const pin = page.getByRole("button", { name: "My county" });
  await expect(pin).toHaveAttribute("aria-pressed", "false");
  await pin.click();
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Pinned" }),
  ).toContainText("this device only");

  await page.goto("/about");
  const first = bar(page).locator("li").first();
  await expect(first).toContainText("Taipei City air (AQI)");
  await expect(first).toContainText("50");
  await expect(first).toContainText("Good");
  await expect(bar(page).locator("li").nth(1)).toContainText(
    "Taipei City temperature",
  );
  await expect(bar(page).locator("li").nth(1)).toContainText("23.0");
  // The national figures follow, unchanged.
  await expect(bar(page)).toContainText("Air quality (AQI)");

  await page.reload();
  await expect(bar(page).locator("li").first()).toContainText(
    "Taipei City air",
  );

  await page.goto("/county/63000");
  await page.getByRole("button", { name: "My county" }).click();
  await page.goto("/about");
  await expect(bar(page)).toContainText("Air quality (AQI)");
  await expect(bar(page)).not.toContainText("Taipei City");
  expect(
    await page.evaluate(() => localStorage.getItem("ecoatlas-county")),
  ).toBeNull();
});

test("the pinned county's figures follow the language switch, and link to its page", async ({
  page,
}) => {
  await mockToday(page);
  await pinAtStart(page, "63000");
  await page.addInitScript(() =>
    localStorage.setItem("ecoatlas-language", "zh"),
  );
  await page.goto("/about");
  const first = bar(page).locator("li").first();
  await expect(first).toContainText("臺北市空氣（AQI）");
  await expect(first.locator("a")).toHaveAttribute("href", "/county/63000");
});

test("a county with no readings in the feed adds nothing to the strip", async ({
  page,
}) => {
  await mockToday(page);
  await pinAtStart(page, "10002");
  await page.goto("/about");
  await expect(bar(page)).toContainText("Air quality (AQI)");
  await expect(bar(page)).not.toContainText("Yilan");
});

test("a stored value that is not a county is ignored", async ({ page }) => {
  await mockToday(page);
  await pinAtStart(page, "99999");
  await page.goto("/about");
  await expect(bar(page)).toContainText("Air quality (AQI)");
  await page.goto("/");
  await expect(page.locator(".cs-now")).toContainText("Showing Taipei City");
});

test("the home page opens on the pinned county, and a county picked there still wins", async ({
  page,
}) => {
  await mockToday(page);
  await pinAtStart(page, "10002");
  await page.goto("/");
  await expect(page.locator(".cs-now")).toContainText("Showing Yilan County");
  await page.locator(".cs-pick select").selectOption("10008");
  await expect(page.locator(".cs-now")).toContainText("Showing Nantou County");
});

test("the weather table lists the pinned county first, marked in words", async ({
  page,
}) => {
  await mockToday(page);
  await page.route("**/api/observations/weather", (route) =>
    route.fulfill({ json: weather }),
  );
  // Set from the page, not an init script, which would pin again on reload.
  await page.goto("/about");
  await page.evaluate(() => localStorage.setItem("ecoatlas-county", "10008"));
  await page.goto("/environment/weather");
  const rows = page.locator(".now-table tbody tr");
  await expect(rows.first()).toHaveAttribute("data-pinned", "");
  await expect(rows.first().locator("th")).toContainText("My county: Nantou");
  await expect(page.locator(".now-table tr[data-pinned]")).toHaveCount(1);
  // Without a pin the order is the sort's: warmest middle station first.
  await page.evaluate(() => localStorage.removeItem("ecoatlas-county"));
  await page.reload();
  await expect(rows.first().locator("th")).toContainText("Taipei");
});

test("Ctrl+K and Cmd+K open search from any page, and bring the cursor back on the search page", async ({
  page,
}) => {
  await mockToday(page);
  await page.goto("/about");
  await page.keyboard.press("Control+k");
  await expect(page).toHaveURL(/\/search$/);
  const box = page.locator("input[data-search-box]");
  await expect(box).toBeFocused();
  await box.fill("Taitung");
  await page.getByRole("heading", { level: 1 }).click();
  await expect(box).not.toBeFocused();
  await page.keyboard.press("Meta+k");
  await expect(box).toBeFocused();
  // The typed text is selected, so the next key replaces it.
  await page.keyboard.type("Hualien");
  await expect(box).toHaveValue("Hualien");
  await expect(
    page.getByRole("link", { name: "Search the atlas" }),
  ).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
});

test("other shortcuts are left alone", async ({ page }) => {
  await page.goto("/about");
  await page.keyboard.press("Control+Shift+k");
  await page.keyboard.press("Alt+k");
  await page.keyboard.press("k");
  await expect(page).toHaveURL(/\/about$/);
});

test("the pin button and the pinned weather row pass automated WCAG checks", async ({
  page,
}) => {
  await mockToday(page);
  await page.route("**/api/observations/weather", (route) =>
    route.fulfill({ json: weather }),
  );
  await pinAtStart(page, "10008");
  for (const url of ["/county/10008", "/environment/weather"]) {
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(url);
      await expect(page.getByText(/Nantou/).first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target),
        })),
        `${url} at ${width}px`,
      ).toEqual([]);
    }
  }
});
