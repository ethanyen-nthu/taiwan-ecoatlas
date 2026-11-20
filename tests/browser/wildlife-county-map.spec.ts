import { expect, test, type Page } from "@playwright/test";

const ready = ".atlas-map .map-canvas-shell[data-map-ready=true]";

/** Move over the map until the county tooltip names the county asked for, so
 *  the test never depends on pixel positions. Returns where it answered. */
async function findCounty(page: Page, name: string) {
  await page.locator(".atlas-map").scrollIntoViewIfNeeded();
  const box = (await page
    .locator("canvas.maplibregl-canvas")
    .first()
    .boundingBox())!;
  const tip = page.locator(".county-tooltip");
  for (let fy = 0.08; fy < 0.95; fy += 0.04)
    for (let fx = 0.1; fx < 0.92; fx += 0.04) {
      const x = box.x + box.width * fx,
        y = box.y + box.height * fy;
      await page.mouse.move(x, y);
      if (
        (await tip.count()) &&
        ((await tip.first().textContent()) || "").startsWith(name)
      )
        return { x, y };
    }
  throw new Error(`${name} was not found on the map`);
}

test("the roadkill page opens on the same shaded county map as the other pages, with the count inside each county", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/wildlife");
  await expect(page.locator(ready)).toBeVisible();
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  // A number sits in every county big enough to hold one.
  await expect
    .poll(() => page.locator(".county-count:not(.is-hidden)").count())
    .toBeGreaterThanOrEqual(8);
  const key = page.getByRole("group", { name: "County shading key" });
  await expect(key).toContainText("Included records per county");
  await expect(key).toContainText("Counts, not rates");
  await expect(key.locator("li")).toHaveCount(5);
  // No squares, no shading switch: the counties are the picture.
  await expect(page.locator(".atlas-tiles")).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Shade counties" }),
  ).toHaveCount(0);
  // The panel starts with all of Taiwan and the animals reported most.
  await expect(page.locator(".cp-head h2")).toHaveText("Taiwan");
  await expect(page.locator(".cp-big strong")).toHaveText("10,841");
  const first = page.locator(".cp-animals li").first();
  await expect(first).toContainText("Asian common toad");
  await expect(first).toContainText("黑眶蟾蜍");
  await expect(first.locator(".photo-thumb")).toBeVisible();
  await expect(page.locator(".cp-note")).toContainText("not roadkill risk");
  expect(errors).toEqual([]);
});

test("choosing a county on the map, in the list or in the filter changes the page and can be undone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/wildlife");
  await expect(page.locator(ready)).toBeVisible();
  await expect(page.locator("[data-map-idle=true]")).toBeVisible();
  const spot = await findCounty(page, "Tainan City");
  await expect(page.locator(".county-tooltip")).toContainText("1,545");
  await page.mouse.click(spot.x, spot.y);
  await expect.poll(() => page.url()).toContain("county=67000");
  await expect(page.locator(".cp-head h2")).toHaveText("Tainan City");
  await expect(page.locator(".cp-big strong")).toHaveText("1,545");
  await expect(page.locator(".cp-head")).toContainText("14% of 10,841");
  await expect(page.locator(".cp-animals h3")).toContainText("Tainan City");
  await expect(page.locator(".county-count[data-selected]")).toHaveText(
    "1,545",
  );
  await expect(page.locator(".cp-animals li a").first()).toHaveAttribute(
    "href",
    /^\/wildlife\/species\//,
  );
  await expect(page.getByLabel("County", { exact: true })).toHaveValue("67000");

  await page.getByRole("button", { name: "Show all counties" }).click();
  await expect.poll(() => page.url()).not.toContain("county=");
  await expect(page.locator(".cp-head h2")).toHaveText("Taiwan");

  // An offshore county has no square of its own any more: the list reaches it.
  await page
    .locator(".atlas-browse")
    .getByRole("button", { name: /Lienchiang County/ })
    .click();
  await expect(page.locator(".cp-head h2")).toHaveText("Lienchiang County");
  await expect(page.locator(".cp-big strong")).toHaveText("1,188");
  await page.getByRole("button", { name: "Show all counties" }).click();

  await page.getByLabel("County", { exact: true }).selectOption("10015");
  await expect(page.locator(".cp-head h2")).toHaveText("Hualien County");
});

test("the Chinese view names the county and the animals in Chinese first", async ({
  page,
}) => {
  await page.goto("/wildlife?county=67000");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.locator(".cp-head h2")).toHaveText("臺南市");
  await expect(page.locator(".cp-animals li").first()).toContainText(
    "黑眶蟾蜍",
  );
  await expect(page.locator(".cp-animals li").first()).toContainText(
    "Asian common toad",
  );
  await expect(page.locator(".cp-big")).toContainText("筆收錄紀錄");
});

test("the 10 km grid is one switch away, keeps the old links working and comes back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/wildlife");
  await expect(page.locator(".cp")).toBeVisible();
  await page.getByRole("button", { name: "10 km grid" }).click();
  await expect.poll(() => page.url()).toContain("view=grid");
  await expect(page.locator(ready)).toBeVisible();
  await expect(page.locator(".cp")).toHaveCount(0);
  await expect(page.locator(".county-count")).toHaveCount(0);
  await page.getByRole("button", { name: "By county" }).click();
  await expect(page.locator(".cp")).toBeVisible();
  await expect.poll(() => page.url()).not.toContain("view=grid");

  // A link saved before the county map existed carried a map mode.
  await page.goto("/wildlife?mode=points");
  await expect(page.locator(ready)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "10 km grid" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("filters narrow the county map: one species leaves only the counties that have it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/wildlife?q=%E9%BB%91%E7%9C%B6");
  await expect(page.locator(".cp")).toBeVisible();
  await expect(page.locator(".cp-animals li")).toHaveCount(1);
  await expect(page.locator(".cp-animals li").first()).toContainText(
    "Asian common toad",
  );
  await expect(page.locator(".cp-big strong")).toHaveText("3,682");
});

test("clicking an animal, in the ranked list or in the table, opens its page with a photo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/wildlife");
  await expect(page.locator(".cp-animals li").first()).toBeVisible();

  // The table names each animal as a link to its page, and "Show on map" only
  // exists where there is a map of single records.
  const rowLink = page.locator(".atlas-record-link").first();
  await expect(rowLink).toHaveAttribute("href", /^\/wildlife\/species\//);
  await expect(page.getByRole("button", { name: "Show on map" })).toHaveCount(
    0,
  );
  await expect(page.locator(".atlas-peek")).toHaveCount(0);

  await page.locator(".cp-animals li a").first().click();
  await expect(page).toHaveURL(/\/wildlife\/species\//);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Asian common toad|黑眶蟾蜍/,
  );
  // The stored photo is on the page at once, with its credit and licence,
  // without waiting for Wikipedia.
  const photo = page.locator(".wiki-gallery figure img");
  await expect(photo).toHaveAttribute(
    "src",
    /upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.*Duttaphrynus_melanostictus/,
  );
  const caption = page.locator(".wiki-gallery figcaption");
  await expect(caption).toContainText("LiCheng Shih");
  await expect(caption).toContainText("CC BY 2.0");
  await expect(
    caption.getByRole("link", { name: "Wikimedia Commons" }),
  ).toHaveAttribute("href", /commons\.wikimedia\.org\/wiki\/File:/);

  await page.goBack();
  await page.getByRole("button", { name: "10 km grid" }).click();
  await expect(
    page.getByRole("button", { name: "Show on map" }).first(),
  ).toBeVisible();
  await expect(page.locator(".atlas-record-link").first()).toBeVisible();
});
