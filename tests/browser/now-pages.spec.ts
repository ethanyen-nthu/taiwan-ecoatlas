import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

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

test("the environment tab strip has six pages in the right order", async ({
  page,
}) => {
  await page.goto("/environment");
  const nav = page.getByRole("navigation", { name: "Pages in this subject" });
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(6);
  const names = await links.allInnerTexts();
  expect(names.map((n) => n.split("\n")[0])).toEqual([
    "Live map",
    "Air over time",
    "Weather now",
    "Temperature over time",
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

// ---- Cite this page, and take the tables as files ----

/** A small CSV reader: quoted fields, doubled quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const body = text.replace(/^\ufeff/, "");
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && body[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function takeCsv(page: Page, buttonName: RegExp | string, nth = 0) {
  const button = page.getByRole("button", { name: buttonName }).nth(nth);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    button.click(),
  ]);
  const text = await readFile((await download.path())!, "utf8");
  return { name: download.suggestedFilename(), text, rows: parseCsv(text) };
}

test("reservoirs: the table downloads as CSV, gaps empty, number kept", async ({
  page,
}) => {
  await mockData(page);
  await page.goto("/environment/reservoirs");
  const cite = page.locator("[data-cite]");
  await expect(cite.getByRole("heading", { level: 2 })).toHaveText(
    "Cite this page and take the numbers",
  );
  await expect(cite.locator(".tp-cite-text")).toContainText(
    "/environment/reservoirs",
  );
  // The title already ends in a question mark: no second full stop after it.
  await expect(cite.locator(".tp-cite-text")).toContainText(
    "reservoirs? https",
  );
  await expect(cite.locator(".tp-cite-text")).not.toContainText("?.");
  // A live page puts the time in the citation.
  await expect(cite.locator(".tp-cite-text")).toContainText(
    /Accessed \d{1,2} \w+ 20\d\d, \d\d:\d\d \(Taiwan time\)\./,
  );
  await expect(cite.getByRole("button", { name: /Download CSV/ })).toHaveCount(
    1,
  );

  const file = await takeCsv(page, /Download CSV/);
  expect(file.name).toBe("taiwan-ecoatlas-environment-reservoirs-1.csv");
  expect(file.text.startsWith("\ufeff")).toBe(true);
  const [head, ...rest] = file.rows;
  expect(head.slice(0, 2)).toEqual(["Reservoir", "Region"]);
  expect(head.at(-1)).toBe("Reservoir no.");
  const width = head.length;
  const data = rest.slice(0, 6);
  for (const row of data) expect(row).toHaveLength(width);
  const luodong = data.find((row) => row.at(-1) === "10802")!;
  // No stored figure, no capacity, no percentage: empty, never zero.
  expect(luodong.slice(2, 5)).toEqual(["", "", ""]);
  expect(luodong[5]).toBe("4.82");
  // Numbers are as the page shows them (one decimal), not the raw feed value.
  expect(data.find((row) => row.at(-1) === "10201")![2]).toBe("202.3");
  await expect(page.locator("[data-cite]")).toContainText(
    "rounded the same way",
  );
  expect(file.text).not.toMatch(/Not given|No reading|—|NaN|undefined/);
  // The source lines sit under a blank line.
  const blank = file.rows.findIndex((row) => row.length === 1 && row[0] === "");
  expect(blank).toBe(7);
  expect(file.rows.slice(blank + 1).map((row) => row[0])).toEqual([
    "Source",
    "Page",
    "Underlying data",
    "Accessed",
  ]);
  expect(file.rows[blank + 2][1]).toContain("/environment/reservoirs");

  // Without the source lines the file is only the table.
  await page
    .getByLabel("Add source lines at the bottom of each file")
    .uncheck();
  const bare = await takeCsv(page, /Download CSV/);
  expect(bare.rows).toHaveLength(7);
  expect(bare.text).not.toContain("Accessed");
});

test("weather: the county table downloads with its gaps empty", async ({
  page,
}) => {
  await mockData(page);
  await page.goto("/environment/weather");
  await expect(page.locator(".now-table tbody tr")).toHaveCount(3);
  const file = await takeCsv(page, /Download CSV/);
  expect(file.name).toBe("taiwan-ecoatlas-environment-weather-1.csv");
  expect(file.rows[0]).toEqual([
    "County",
    "Stations",
    "Middle °C",
    "Coolest °C",
    "Warmest °C",
    "Humidity %",
    "Rain today mm",
    "Wind m/s",
  ]);
  const yilan = file.rows.find((row) => row[0] === "Yilan County")!;
  expect(yilan.slice(0, 5)).toEqual(["Yilan County", "1", "", "", ""]);
  const taipei = file.rows.find((row) => row[0] === "Taipei City")!;
  expect(taipei[2]).toBe("23.0");
});

test("a history page: every table has a file that matches what it shows", async ({
  page,
}) => {
  await page.goto("/wildlife/year-by-year");
  const tables = await page.locator("main table").count();
  expect(tables).toBeGreaterThan(0);
  const buttons = page.locator("[data-cite]").getByRole("button", {
    name: /Download CSV/,
  });
  await expect(buttons).toHaveCount(tables);
  await expect(page.locator("[data-cite] .tp-cite-text")).toContainText(
    /Accessed \d{1,2} \w+ 20\d\d\./,
  );

  const shown = await page.evaluate(() => {
    const table = document.querySelector("main table")!;
    const text = (cell: Element) =>
      cell.textContent!.replace(/\s+/g, " ").trim();
    return {
      head: [...(table as HTMLTableElement).tHead!.rows[0].cells].map(text),
      rows: (table as HTMLTableElement).tBodies[0].rows.length,
    };
  });
  const file = await takeCsv(page, /Download CSV/, 0);
  expect(file.name).toBe("taiwan-ecoatlas-wildlife-year-by-year-1.csv");
  expect(file.rows[0]).toEqual(shown.head);
  expect(file.rows.slice(1, 1 + shown.rows)).toHaveLength(shown.rows);
  for (const row of file.rows.slice(1, 1 + shown.rows))
    expect(row).toHaveLength(shown.head.length);
  expect(file.text).not.toMatch(/NaN|undefined/);
  // A history page is not a live reading: the date has no clock time.
  await expect(page.locator("[data-cite] .tp-cite-text")).not.toContainText(
    "Taiwan time",
  );
});

test("the citation reads in Chinese and copies", async ({ page }) => {
  await page.goto("/plants/surveys");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  const cite = page.locator("[data-cite]");
  await expect(cite.getByRole("heading", { level: 2 })).toHaveText(
    "引用本頁，取得數字",
  );
  await expect(cite.locator(".tp-cite-text")).toContainText(
    "臺灣環境與文化地圖",
  );
  await expect(cite.locator(".tp-cite-text")).toContainText(
    /檢索日期：20\d\d年\d{1,2}月\d{1,2}日。/,
  );
  await expect(
    cite.getByRole("button", { name: /下載 CSV/ }).first(),
  ).toBeVisible();
  await cite.getByRole("button", { name: "複製引用" }).click();
  await expect(cite.getByRole("button", { name: "已複製引用" })).toBeVisible();
});
