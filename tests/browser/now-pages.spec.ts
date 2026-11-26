import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Every figure below is synthetic and exists only inside these tests'
// network mocks. The application never uses it.
const stamp = "2026-11-26T06:00:00.000Z";
const reading = (
  id: string,
  name: string | null,
  region: string,
  storageMcm: number | null,
  capacityMcm: number | null,
  level: number | null,
  full: number | null,
) => ({
  id,
  name,
  region,
  observedAt: stamp,
  storageMcm,
  capacityMcm,
  percent:
    storageMcm !== null && capacityMcm
      ? (storageMcm / capacityMcm) * 100
      : null,
  levelM: level,
  fullLevelM: full,
  belowFullM: level !== null && full !== null ? full - level : null,
  catchmentRainMm: null,
});
const reservoirs = {
  status: "fresh",
  readings: [
    reading("10201", "石門水庫", "north", 202.27, 205.26, 244.65, 245),
    reading("30502", "曾文水庫", "south", 388.25, 486.54, 224.44, 230),
    reading("20501", "霧社水庫", "central", 10.64, 24.33, 997.86, 1005),
    reading("30802", "阿公店水庫", "south", 17.45, 14.8, 37.87, 37),
    reading("10802", "羅東攔河堰", "north", null, null, 4.82, null),
    reading("40701", null, "east", null, null, null, null),
  ],
  lastObservationAt: stamp,
  retrievedAt: stamp,
  checkedAt: stamp,
  message: null,
};

const station = (
  id: string,
  name: string,
  county: string,
  temperature: number | null,
  rainfall: number | null,
) => ({
  id,
  source: "O-A0003-001",
  station: name,
  county,
  longitude: 121,
  latitude: 24,
  observedAt: stamp,
  publishedAt: null,
  status: null,
  values: {
    temperature,
    rainfall,
    humidity: 80,
    windSpeed: 3,
    windDirection: 90,
  },
});
const weather = {
  source: "weather",
  status: "fresh",
  lastObservationAt: stamp,
  publishedAt: null,
  retrievedAt: stamp,
  checkedAt: stamp,
  excluded: 0,
  duplicates: 7,
  message: null,
  observations: [
    station("a", "Alpha", "臺北市", 22, 0),
    station("b", "Bravo", "臺北市", 24, 12.5),
    station("c", "Charlie", "南投縣", 3.2, 0),
    station("d", "Delta", "南投縣", 19, 3),
    station("e", "Echo", "南投縣", 21, null),
    station("f", "Foxtrot", "宜蘭縣", null, null),
  ],
};
const air = {
  ...weather,
  source: "aqi",
  observations: [
    {
      ...station("z1", "Zhongshan", "臺北市", null, null),
      source: "aqi",
      status: "良好",
      values: { aqi: 40, pm25: 8 },
    },
    {
      ...station("z2", "Wanhua", "臺北市", null, null),
      source: "aqi",
      status: "普通",
      values: { aqi: 60, pm25: 15 },
    },
  ],
};

async function mockData(page: Page) {
  await page.route("**/api/reservoirs", (route) =>
    route.fulfill({ json: reservoirs }),
  );
  await page.route("**/api/observations/weather", (route) =>
    route.fulfill({ json: weather }),
  );
  await page.route("**/api/observations/aqi", (route) =>
    route.fulfill({ json: air }),
  );
}
const noOverflow = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);

test("the environment tab strip has five pages in the right order", async ({
  page,
}) => {
  await page.goto("/environment");
  const nav = page.getByRole("navigation", { name: "Pages in this subject" });
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(5);
  const names = await links.allInnerTexts();
  expect(names.map((n) => n.split("\n")[0])).toEqual([
    "Live map",
    "Air over time",
    "Weather now",
    "Reservoirs now",
    "Rivers over time",
  ]);
});

test("reservoirs: figures, bars and the table all come from the feed", async ({
  page,
}) => {
  await mockData(page);
  await page.goto("/environment/reservoirs");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /How full are Taiwan’s reservoirs/,
    }),
  ).toBeVisible();
  const facts = page.locator(".tp-facts");
  // Three large reservoirs with both figures: 石門, 曾文, 霧社 and 阿公店 make four.
  const storage = 202.27 + 388.25 + 10.64 + 17.45;
  const capacity = 205.26 + 486.54 + 24.33 + 14.8;
  await expect(facts).toContainText(
    `${((storage / capacity) * 100).toFixed(1)}%`,
  );
  await expect(facts).toContainText("Wushe Reservoir");
  await expect(facts).toContainText("43.7%");
  await expect(facts).toContainText(
    "Reservoirs with a water level but no percentage: 1",
  );

  const bars = page.locator("ol.hb .hb-row");
  await expect(bars).toHaveCount(4);
  // Biggest first.
  await expect(bars.first()).toContainText("Tsengwen Reservoir");
  const over = bars.filter({ hasText: "Agongdian" });
  await expect(over).toContainText("117.9%");
  await expect(over).toContainText("above 100%");
  await expect(over).toHaveAttribute("data-over", "true");

  const rows = page.locator(".now-table tbody tr");
  await expect(rows).toHaveCount(6);
  // A weir has a level but no storage: dashes with spoken text, never zeros.
  const weir = rows.filter({ hasText: "羅東攔河堰" });
  await expect(weir).toContainText("4.82");
  await expect(weir.locator("td[data-empty=true]").first()).toBeVisible();
  await expect(weir.locator(".tp-sr").first()).toHaveText("Not given");
  // The reservoir with no name is labelled by its number.
  await expect(rows.filter({ hasText: "No. 40701" })).toHaveCount(1);
  // Sources are listed.
  await expect(page.locator(".tp-sources a")).toHaveCount(2);
});

test("reservoirs: when the feed is down, nothing is invented", async ({
  page,
}) => {
  await page.route("**/api/reservoirs", (route) =>
    route.fulfill({
      json: {
        status: "unavailable",
        readings: [],
        lastObservationAt: null,
        retrievedAt: null,
        checkedAt: stamp,
        message: "upstream-unavailable",
      },
    }),
  );
  await page.goto("/environment/reservoirs");
  await expect(page.locator(".now-empty")).toContainText("not answering");
  await expect(page.locator(".tp-facts")).toHaveCount(0);
  await expect(page.locator("ol.hb")).toHaveCount(0);
  await expect(page.locator(".now-table")).toHaveCount(0);
});

test("reservoirs: Chinese names and labels, no clipped bars", async ({
  page,
}) => {
  await mockData(page);
  await page.goto("/environment/reservoirs");
  await page.getByRole("button", { name: "繁中" }).click();
  await expect(page.locator("main h1")).toContainText("水庫");
  await expect(page.locator("ol.hb .hb-row").first()).toContainText("曾文水庫");
  await expect(page.locator(".hb-scale")).toContainText("100%");
  await expect(
    page.locator("nav.section-tabs a[aria-current='page']"),
  ).toContainText("水庫現況");
});

test("weather: county table, extremes and rain, sortable", async ({ page }) => {
  await mockData(page);
  await page.goto("/environment/weather");
  await expect(
    page.getByRole("heading", { level: 1, name: /weather doing right now/ }),
  ).toBeVisible();
  const facts = page.locator(".tp-facts");
  await expect(facts).toContainText("6"); // stations
  await expect(facts).toContainText("3 counties and cities");
  await expect(facts).toContainText("7 repeat readings");
  await expect(facts).toContainText("24.0 °C");
  await expect(facts).toContainText("Bravo, Taipei City");
  await expect(facts).toContainText("3.2 °C");
  await expect(facts).toContainText("Charlie, Nantou County");

  // 宜蘭縣 has a station but no temperature: a gap, not a zero.
  const yilan = page.locator(".now-table tbody tr", {
    hasText: "Yilan County",
  });
  await expect(yilan.locator("td[data-empty=true]").first()).toBeVisible();
  await expect(yilan).not.toContainText("0.0");

  // Default sort is warmest middle station first; the missing county is last.
  const names = page.locator(".now-table tbody th");
  await expect(names.first()).toHaveText("Taipei City");
  await expect(names.last()).toHaveText("Yilan County");
  await page.getByRole("button", { name: "County", exact: true }).click();
  await expect(
    page.locator(".now-table thead th[aria-sort='ascending']"),
  ).toContainText("County");
  await expect(names.first()).toHaveText("Nantou County");

  // Rain so far today: only stations that recorded some.
  const rain = page.locator("section[aria-labelledby='wx-rain'] .hb-row");
  await expect(rain).toHaveCount(2);
  await expect(rain.first()).toContainText("Bravo");
  await expect(rain.first()).toContainText("12.5 mm");
});

test("weather: not configured is said plainly", async ({ page }) => {
  await page.route("**/api/observations/weather", (route) =>
    route.fulfill({
      json: {
        ...weather,
        status: "not-configured",
        observations: [],
        lastObservationAt: null,
        message: "CWA_API_KEY",
      },
    }),
  );
  await page.goto("/environment/weather");
  await expect(page.locator(".now-empty")).toContainText("not set up");
  await expect(page.locator(".now-table")).toHaveCount(0);
});

for (const path of ["/environment/reservoirs", "/environment/weather"]) {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`${path} passes axe and fits at ${size.width}px`, async ({ page }) => {
      await mockData(page);
      await page.setViewportSize(size);
      await page.goto(path);
      await expect(page.locator(".now-table")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.length}`),
      ).toEqual([]);
      await noOverflow(page);
    });
  }
}

test("home: pick a county and see all six subjects side by side", async ({
  page,
}) => {
  await mockData(page);
  await page.goto("/");
  const section = page.locator("section.cs");
  await expect(
    section.getByRole("heading", {
      level: 2,
      name: "Your county, side by side",
    }),
  ).toBeVisible();
  const cards = section.locator("li.cs-card");
  await expect(cards).toHaveCount(6);

  // Taipei is selected first, and has air, urban and tree figures.
  const select = section.getByRole("combobox", { name: "County or city" });
  await expect(select).toHaveValue("63000");
  const air = cards.nth(0);
  await expect(air.locator(".cs-num")).toHaveText("50"); // middle of 40 and 60
  await expect(air).toContainText("Good"); // 50 is the top of the Good band
  await expect(air).toContainText("middle station 23.0 °C, from 22.0 to 24.0");
  await expect(cards.nth(4).locator(".cs-num")).not.toHaveText("—");
  await expect(cards.nth(5).locator(".cs-num")).not.toHaveText("—");

  // A county outside Taipei: dashes with the reason, never zero.
  await select.selectOption("10002"); // Yilan
  await expect(section.locator(".cs-now")).toContainText("Yilan County");
  await expect(cards.nth(4).locator(".cs-num")).toHaveText("—");
  await expect(cards.nth(4)).toContainText("Taipei City only");
  await expect(cards.nth(5).locator(".cs-num")).toHaveText("—");
  // No air readings for Yilan in the mock: a dash, and it says so.
  await expect(air.locator(".cs-num")).toHaveText("—");
  await expect(air).toContainText("No live air-quality readings");

  // The wildlife and village numbers agree with the county's own profile page.
  const wildlife = (await cards.nth(2).locator(".cs-num").innerText()).trim();
  const villages = (await cards.nth(3).locator(".cs-num").innerText()).trim();
  await section
    .getByRole("link", { name: /Full profile for Yilan County/ })
    .click();
  await expect(page).toHaveURL(/\/county\/10002$/);
  await expect(
    page.locator("li[data-tone=wildlife] .subject-tile-number"),
  ).toHaveText(wildlife);
  await expect(
    page.locator("li[data-tone=culture] .subject-tile-number"),
  ).toHaveText(villages);
});

test("home: the county section works in Chinese and on a phone", async ({
  page,
}) => {
  await mockData(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "繁中" }).click();
  const section = page.locator("section.cs");
  await expect(section.getByRole("heading", { level: 2 })).toHaveText(
    "你的縣市，並排來看",
  );
  await expect(section.locator(".cs-now")).toContainText("臺北市");
  await expect(section.locator("li.cs-card")).toHaveCount(6);
  await noOverflow(page);
  const results = await new AxeBuilder({ page })
    .include("section.cs")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual(
    [],
  );
});
