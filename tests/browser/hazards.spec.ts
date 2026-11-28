import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Every report here is synthetic and exists only in these tests' network
// mocks. The application never uses it.
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3600_000).toISOString();

const quake = (over: Record<string, unknown>) => ({
  id: "significant-115021",
  feed: "significant",
  number: "115021",
  originTime: hoursAgo(3),
  latitude: 23.88,
  longitude: 121.9,
  depthKm: 18.4,
  magnitude: 5.6,
  magnitudeType: "芮氏規模",
  locationZh: "花蓮縣政府東南東方 31.0 公里",
  maxIntensity: { label: "5弱", rank: 5 },
  areas: [
    { county: "花蓮縣", intensity: { label: "5弱", rank: 5 } },
    { county: "宜蘭縣", intensity: { label: "3", rank: 3 } },
  ],
  summaryZh: null,
  reportUrl: "https://www.cwa.gov.tw/V8/C/E/EQ/EQ115021.html",
  ...over,
});
const fix = (over: Record<string, unknown>) => ({
  time: hoursAgo(2),
  tauHours: null,
  latitude: 21.2,
  longitude: 125.4,
  maxWindMs: 35,
  gustMs: 45,
  pressureHpa: 955,
  speedKmh: 18,
  direction: "WNW",
  radius15: 180,
  radius15Quadrants: { NE: 200, SE: 180, SW: 150, NW: 170 },
  radius25: 70,
  radius70: null,
  ...over,
});
const withCyclone = () => ({
  id: "27",
  nameEn: "TESTNAME",
  nameZh: "測試",
  number: "27",
  past: [fix({ latitude: 19, longitude: 128, time: hoursAgo(14) }), fix({})],
  current: fix({}),
  forecast: [
    fix({
      tauHours: 12,
      time: hoursAgo(-10),
      latitude: 21.8,
      longitude: 124.2,
      radius70: 70,
      radius15: null,
      radius15Quadrants: null,
      radius25: null,
    }),
  ],
});
const fresh = {
  status: "fresh",
  retrievedAt: new Date().toISOString(),
  message: null,
  excluded: 0,
};
const hazards = (over: Record<string, unknown> = {}) => ({
  checkedAt: new Date().toISOString(),
  earthquakes: {
    ...fresh,
    feeds: { significant: "ok", local: "ok" },
    events: [
      quake({}),
      quake({
        id: "local-115022",
        feed: "local",
        number: "115022",
        originTime: hoursAgo(9),
        latitude: 23.1,
        longitude: 121.2,
        magnitude: 4.1,
        maxIntensity: { label: "4", rank: 4 },
        areas: [{ county: "臺東縣", intensity: { label: "4", rank: 4 } }],
        reportUrl: null,
      }),
    ],
  },
  typhoon: { ...fresh, feed: "ok", cyclones: [withCyclone()] },
  ...over,
});
const down = {
  status: "unavailable",
  retrievedAt: null,
  message: "upstream-unavailable",
  excluded: 0,
};
const mock = (page: Page, body: unknown) =>
  page.route("**/api/hazards", (route) => route.fulfill({ json: body }));

const row = (page: Page, name: string) =>
  page.locator(".layer-row").filter({ hasText: name });

test("the earthquake layer lists reports, opens a popup with its source, and has a key", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mock(page, hazards());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();

  const quakes = page.getByRole("switch", { name: "Felt earthquakes" });
  await expect(quakes).toHaveAttribute("aria-checked", "false");
  await expect(
    row(page, "Felt earthquakes").locator(".layer-live"),
  ).toContainText("2 felt earthquakes in the agency’s recent reports");
  // The key and the list appear only while the layer is on.
  await expect(page.locator("[data-legend=earthquakes]")).toHaveCount(0);
  await expect(page.locator("[data-hazard-list=earthquakes]")).toHaveCount(0);
  await quakes.click();
  await expect(quakes).toHaveAttribute("aria-checked", "true");
  const key = page.locator("[data-legend=earthquakes]");
  await expect(key).toContainText("Felt earthquakes");
  await expect(key).toContainText("Intensity not reported");
  await expect(key).toContainText("Circle size shows magnitude");

  await page.getByText("List the 2 reports").click();
  const items = page.locator("[data-hazard-list=earthquakes] button");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toHaveText(
    /^M5\.6 · Hualien County 5 weak · 3 h ago$/,
  );
  await items.first().click();
  const popup = page.locator(".maplibregl-popup");
  await expect(popup.locator("h3")).toHaveText("Magnitude 5.6");
  await expect(popup).toContainText("Focal depth: 18.4 km");
  await expect(popup).toContainText(
    "Strongest shaking: Hualien County, intensity 5 weak",
  );
  await expect(popup).toContainText("Also felt: Yilan County 3");
  await expect(popup).toContainText("E-A0015-001");
  await expect(popup).toContainText("Open Government Data License 1.0");
  await expect(
    popup.getByRole("link", { name: /CWA earthquake report/ }),
  ).toHaveAttribute("href", "https://www.cwa.gov.tw/V8/C/E/EQ/EQ115021.html");
  // A report with no link of its own falls back to the open-data manual.
  await items.nth(1).click();
  await expect(popup.locator("h3")).toHaveText("Magnitude 4.1");
  await expect(popup).toContainText("E-A0016-001");
  await expect(
    popup.getByRole("link", { name: "Original source" }),
  ).toHaveAttribute(
    "href",
    "https://opendata.cwa.gov.tw/devManual/description",
  );

  // Details tab names the feeds and when they were read.
  await page.getByRole("tab", { name: "Data details" }).click();
  const detail = page.locator("[data-hazard-detail=earthquakes]");
  await expect(detail).toContainText("E-A0015-001 / E-A0016-001");
  await expect(detail).toContainText("Read · Read");
  await expect(detail).toContainText("Open Government Data License 1.0");

  // Traditional Chinese.
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await page.getByRole("tab", { name: "圖層" }).click();
  await expect(row(page, "有感地震").locator(".layer-live")).toContainText(
    "氣象署近期報告中有 2 筆有感地震",
  );
  expect(errors).toEqual([]);
});

test("the cyclone layer draws the track, names it, opens a popup that says it is not a warning, and is axe-clean", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mock(page, hazards());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/explore?layers=typhoon,earthquakes");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  // Both switches start on when the link asks for them.
  await expect(
    page.getByRole("switch", { name: "Tropical cyclone track" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("switch", { name: "Felt earthquakes" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".typhoon-label")).toHaveText("TESTNAME");
  await expect(
    row(page, "Tropical cyclone track").locator(".layer-live"),
  ).toHaveText("TESTNAME, moderate typhoon; position analysed 2 h ago.");
  const key = page.locator("[data-legend=typhoon]");
  await expect(key).toContainText("Analysed track");
  await expect(key).toContainText("70% probability circle");
  await expect(key).toContainText("not a warning");

  await page.getByText("Go to its latest position").click();
  await page
    .locator("[data-hazard-list=typhoon] button")
    .filter({ hasText: "TESTNAME · Moderate typhoon" })
    .click();
  const popup = page.locator(".maplibregl-popup");
  await expect(popup.locator("h3")).toHaveText("TESTNAME");
  await expect(popup).toContainText("LATEST ANALYSED POSITION");
  await expect(popup).toContainText("Maximum wind: 35 m/s");
  await expect(popup).toContainText(
    "Radius of 15 m/s winds (Beaufort 7): 180 km",
  );
  await expect(popup).toContainText("not a warning");
  await expect(popup).toContainText("W-C0034-005");
  // A long popup scrolls inside the map and can be reached from the keyboard.
  const region = popup.getByRole("region", { name: "TESTNAME track details" });
  await expect(region).toHaveAttribute("tabindex", "0");
  await expect(region).toHaveCSS("overflow-y", "auto");
  await expect(
    popup.getByRole("link", { name: "CWA typhoon news" }),
  ).toHaveAttribute(
    "href",
    "https://www.cwa.gov.tw/V8/E/P/Typhoon/TY_NEWS.html",
  );

  // The tab key reaches the list and the switches; nothing here is canvas-only.
  const scan = await new AxeBuilder({ page })
    .include(".explorer-panel")
    .include(".map-legend")
    .include(".maplibregl-popup")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(scan.violations).toEqual([]);

  // Switching a layer off removes its label and key.
  await page.getByRole("switch", { name: "Tropical cyclone track" }).click();
  await expect(page.locator(".typhoon-label")).toHaveCount(0);
  await expect(page.locator("[data-legend=typhoon]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("switching the cyclone layer on frames Taiwan and the storm together, once per switch-on", async ({
  page,
}) => {
  await mock(page, hazards());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  const canvas = page.locator(".maplibregl-canvas").first();
  const inView = async () => {
    const box = await canvas.boundingBox();
    const label = await page.locator(".typhoon-label").boundingBox();
    if (!box || !label) return false;
    return (
      label.x >= box.x &&
      label.y >= box.y &&
      label.x + label.width <= box.x + box.width &&
      label.y + label.height <= box.y + box.height
    );
  };

  // The synthetic storm sits far east of the island, outside the home view.
  await page.getByRole("switch", { name: "Tropical cyclone track" }).click();
  await expect(page.locator(".typhoon-label")).toHaveText("TESTNAME");
  await expect.poll(inView).toBe(true);

  // A drag is not undone by the next refresh of the same storm.
  const box = (await canvas.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 700, centre.y, { steps: 12 });
  await page.mouse.up();
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 700, centre.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(inView).toBe(false);

  // Switching it off and on again frames it once more.
  await page.getByRole("switch", { name: "Tropical cyclone track" }).click();
  await expect(page.locator(".typhoon-label")).toHaveCount(0);
  await page.getByRole("switch", { name: "Tropical cyclone track" }).click();
  await expect(page.locator(".typhoon-label")).toHaveText("TESTNAME");
  await expect.poll(inView).toBe(true);
});

test("a link that opens the map with the cyclone layer on frames the storm too", async ({
  page,
}) => {
  await mock(page, hazards());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/explore?layers=typhoon");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(page.locator(".typhoon-label")).toHaveText("TESTNAME");
  await expect
    .poll(async () => {
      const box = await page
        .locator(".maplibregl-canvas")
        .first()
        .boundingBox();
      const label = await page.locator(".typhoon-label").boundingBox();
      if (!box || !label) return false;
      return (
        label.x >= box.x &&
        label.x + label.width <= box.x + box.width &&
        label.y >= box.y &&
        label.y + label.height <= box.y + box.height
      );
    })
    .toBe(true);
});

test("no cyclone is reported as none only when the feed answered; a feed that is down says so", async ({
  page,
}) => {
  await mock(
    page,
    hazards({
      typhoon: { ...fresh, feed: "ok", cyclones: [] },
    }),
  );
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(
    row(page, "Tropical cyclone track").locator(".layer-live"),
  ).toHaveText("No tropical cyclone is being tracked right now.");
  await page.getByRole("switch", { name: "Tropical cyclone track" }).click();
  await expect(page.locator("[data-hazard-list=typhoon]")).toHaveCount(0);
  await expect(page.locator(".typhoon-label")).toHaveCount(0);

  // An old track the feed still holds is named, never drawn as a storm.
  await page.unroute("**/api/hazards");
  await mock(
    page,
    hazards({
      typhoon: {
        ...fresh,
        feed: "ok",
        cyclones: [],
        older: { count: 1, newestAt: hoursAgo(24 * 17) },
      },
    }),
  );
  await page.reload();
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(
    row(page, "Tropical cyclone track").locator(".layer-live"),
  ).toHaveText(
    "No tropical cyclone is being tracked right now. The agency's feed still lists one last updated 17 days ago; it is not shown as current.",
  );

  await page.unroute("**/api/hazards");
  await mock(
    page,
    hazards({
      earthquakes: {
        ...down,
        feeds: { significant: "unavailable", local: "unavailable" },
        events: [],
      },
      typhoon: {
        ...down,
        feed: "unreadable",
        message: "unreadable-payload",
        cyclones: [],
      },
    }),
  );
  await page.reload();
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  const quakeLine = row(page, "Felt earthquakes").locator(".layer-live");
  await expect(quakeLine).toContainText("not answering");
  await expect(quakeLine).not.toContainText("no felt");
  const cycloneLine = row(page, "Tropical cyclone track").locator(
    ".layer-live",
  );
  await expect(cycloneLine).toContainText("could not be read");
  await expect(cycloneLine).not.toContainText("No tropical cyclone");
  await expect(row(page, "Felt earthquakes").locator(".status")).toContainText(
    "Unavailable",
  );
});

test("with no key configured, the layers say so and nothing is drawn", async ({
  page,
}) => {
  // No mock: the real route, with no key, as in a fresh install.
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await expect(
    row(page, "Felt earthquakes").locator(".layer-live"),
  ).toContainText("Needs the agency key");
  await expect(
    row(page, "Tropical cyclone track").locator(".status"),
  ).toContainText("Not configured");
});

test("the Today strip shows a tracked cyclone first and the latest felt earthquake, and the link opens the layer", async ({
  page,
}) => {
  await mock(page, hazards());
  await page.goto("/environment");
  const bar = page.locator("[data-today=bar]");
  const cyclone = bar.getByRole("link", { name: /Tropical cyclone/ });
  await expect(cyclone).toContainText("TESTNAME");
  await expect(cyclone).toContainText("Moderate typhoon");
  await expect(cyclone).toHaveAttribute("href", "/explore?layers=typhoon");
  await expect(cyclone).toHaveAttribute("title", /not a warning/);
  const first = bar.locator("li").first();
  await expect(first).toContainText("Tropical cyclone");
  const felt = bar.getByRole("link", { name: /Latest felt earthquake/ });
  await expect(felt).toContainText("M5.6");
  await expect(felt).toContainText("3 h ago");
  await expect(felt).toHaveAttribute(
    "title",
    /Hualien County, intensity 5 weak/,
  );

  await cyclone.click();
  await expect(page).toHaveURL(/\/explore\?layers=typhoon$/);
  await expect(
    page.getByRole("switch", { name: "Tropical cyclone track" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("switch", { name: "Felt earthquakes" }),
  ).toHaveAttribute("aria-checked", "false");
});

test("the Today strip adds nothing when the feeds are down, and never says none", async ({
  page,
}) => {
  await mock(
    page,
    hazards({
      earthquakes: {
        ...down,
        feeds: { significant: "unavailable", local: "unavailable" },
        events: [],
      },
      typhoon: { ...down, feed: "unavailable", cyclones: [] },
    }),
  );
  const answered = page.waitForResponse("**/api/hazards");
  await page.goto("/environment");
  await answered;
  // Other live figures (reservoirs need no key) may still fill the strip, so
  // this checks only what the hazard feeds must not add: no figure, no link to
  // their layers, and never a "none reported" line in the strip's place.
  const strip = page.locator("[data-today=bar]");
  await expect(strip.locator("a[href^='/explore?layers=']")).toHaveCount(0);
  await expect(strip).not.toContainText("Tropical cyclone");
  await expect(strip).not.toContainText("felt earthquake");
  await expect(strip).not.toContainText(/none/i);
});
