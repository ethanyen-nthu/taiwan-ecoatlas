import { expect, test } from "@playwright/test";

test("a section map view lives in the link and reopens exactly", async ({
  page,
}) => {
  await page.goto("/wildlife");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await page.getByLabel("County", { exact: true }).selectOption("10008");
  await expect.poll(() => page.url()).toContain("county=10008");
  await page.getByLabel("Search records").fill("Suncus");
  await expect.poll(() => page.url()).toContain("q=Suncus");
  const link = page.url();

  await page.goto(link);
  await expect(page.getByLabel("County", { exact: true })).toHaveValue("10008");
  await expect(page.getByLabel("Search records")).toHaveValue("Suncus");
});

test("copy link confirms, and shading counties can be turned off and stays off in the link", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/culture");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  const shade = page.getByRole("checkbox", { name: "Shade counties" });
  await expect(shade).toBeChecked();
  const key = page.getByRole("group", { name: "County shading key" });
  await expect(key).toContainText("Included records per county");
  await expect(key).toContainText("Counts, not rates");
  await shade.uncheck();
  await expect(key).toHaveCount(0);
  await expect.poll(() => page.url()).toContain("shade=0");
  await page.getByRole("button", { name: "Copy link to this view" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "shade=0",
  );
});

test("forests start on the land-cover image and can switch to county shares", async ({
  page,
}) => {
  await page.goto("/forests");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  const shade = page.getByRole("checkbox", { name: "Shade counties" });
  await expect(shade).not.toBeChecked();
  await expect(page.getByLabel("Land-cover legend")).toBeVisible();
  await shade.check();
  const key = page.getByRole("group", { name: "County shading key" });
  await expect(key).toBeVisible();
  await expect(key).toContainText("County mean");
  await expect(page.getByLabel("Land-cover legend")).toHaveCount(0);
});

test("each section page opens with its own colour field and island mark", async ({
  page,
}) => {
  for (const [route, tone] of [
    ["/environment", "#0a4d74"],
    ["/wildlife", "#653f06"],
    ["/culture", "#74311f"],
  ] as const) {
    await page.goto(route);
    const head = page.locator(".atlas-head");
    await expect(head).toBeVisible();
    await expect(head.locator(".atlas-head-island")).toBeAttached();
    const background = await head.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const hex = `#${background
      .match(/\d+/g)!
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")}`;
    expect(hex).toBe(tone);
  }
});

test("air-quality counties take the official AQI colour of their mean reading", async ({
  page,
}) => {
  const catalogue = await (await page.request.get("/api/atlas")).json();
  const dataset = catalogue.datasets.find(
    (item: { id: string }) => item.id === "live-aqi",
  );
  const counties = [
    ["63000", 38],
    ["65000", 55],
    ["66000", 72],
    ["67000", 104],
    ["64000", 130],
    ["10002", 22],
  ].map(([code, value]) => ({ code, count: 4, value, measured: 4 }));
  await page.route("**/api/atlas/live-aqi?**", (route) =>
    route.fulfill({
      json: {
        dataset,
        collection: { type: "FeatureCollection", features: [] },
        records: [],
        total: 24,
        inViewport: 24,
        aggregated: false,
        nextOffset: null,
        categories: [],
        species: [],
        counties,
        timeline: [],
        dateRange: null,
        retrievedAt: new Date().toISOString(),
        status: "live",
      },
    }),
  );
  await page.goto("/environment");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  const key = page.getByRole("group", { name: "County shading key" });
  await expect(key).toContainText("official AQI colour");
  // Soft tints of the six official bands, named in the key.
  await expect(key.locator("ol:not(.atlas-aqi-tints)")).toHaveCount(0);
  await expect(key.locator(".atlas-aqi-tints li")).toHaveCount(6);
  // The county list is ranked by the mean reading, highest first.
  await expect(
    page.locator(".atlas-counties li button .atlas-county-num").first(),
  ).toHaveText("130");
});
