import { expect, test } from "@playwright/test";

test("the roadkill page opens on a county map with numbers inside the counties, not squares", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/wildlife");
  const map = page.locator(".wm svg");
  await expect(map).toBeVisible();
  // Nineteen counties on the main island; the three offshore ones are chips.
  await expect(map.locator("path[role=button]")).toHaveCount(19);
  await expect(map.locator("text.wm-num").first()).toBeVisible();
  expect(await map.locator("text.wm-num").count()).toBeGreaterThanOrEqual(8);
  const key = page.getByRole("group", { name: "County shading key" });
  await expect(key).toContainText("Included records per county");
  await expect(key.locator("li")).toHaveCount(5);
  await expect(page.locator(".wm-offshore")).toContainText("Lienchiang County");
  await expect(page.locator(".wm-offshore")).toContainText("1,188");
  // No tile map and no square legend on this view.
  await expect(page.locator(".map-canvas-shell")).toHaveCount(0);
  await expect(page.locator(".atlas-tiles")).toHaveCount(0);
  // The side panel starts with all of Taiwan and the animals reported most.
  await expect(page.locator(".wm-head h2")).toHaveText("Taiwan");
  await expect(page.locator(".wm-big strong")).toHaveText("10,841");
  await expect(page.locator(".wm-animals li").first()).toContainText(
    "Asian common toad",
  );
  await expect(page.locator(".wm-animals li").first()).toContainText(
    "黑眶蟾蜍",
  );
  await expect(page.locator(".wm-note")).toContainText("not roadkill risk");
  expect(errors).toEqual([]);
});

test("choosing a county on the map, a chip or the keyboard filters the page and can be undone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/wildlife");
  await expect(page.locator(".wm svg")).toBeVisible();
  await page.locator('.wm svg path[aria-label^="Tainan City"]').click();
  await expect.poll(() => page.url()).toContain("county=67000");
  await expect(page.locator(".wm-head h2")).toHaveText("Tainan City");
  await expect(page.locator(".wm-big strong")).toHaveText("1,545");
  await expect(page.locator(".wm-head")).toContainText("14% of 10,841");
  await expect(page.locator(".wm-animals h3")).toContainText("Tainan City");
  await expect(page.locator(".wm svg")).toHaveAttribute("data-picked", "");
  const first = page.locator(".wm-animals li a").first();
  await expect(first).toHaveAttribute("href", /^\/wildlife\/species\//);
  await expect(page.getByLabel("County", { exact: true })).toHaveValue("67000");

  await page.getByRole("button", { name: "Show all counties" }).click();
  await expect.poll(() => page.url()).not.toContain("county=");
  await expect(page.locator(".wm-head h2")).toHaveText("Taiwan");

  await page
    .locator(".wm-offshore")
    .getByRole("button", { name: /Lienchiang County/ })
    .click();
  await expect(page.locator(".wm-head h2")).toHaveText("Lienchiang County");
  await expect(page.locator(".wm-big strong")).toHaveText("1,188");
  // An offshore county is not on the island drawing, so nothing is dimmed.
  await expect(page.locator(".wm svg")).not.toHaveAttribute("data-picked", "");
  await page.getByRole("button", { name: "Show all counties" }).click();

  const hualien = page.locator('.wm svg path[aria-label^="Hualien"]');
  await hualien.focus();
  await expect(page.locator(".wm svg text.wm-tip")).toContainText("Hualien");
  await page.keyboard.press("Enter");
  await expect(page.locator(".wm-head h2")).toHaveText("Hualien County");
});

test("the Chinese view names the county and the animals in Chinese first", async ({
  page,
}) => {
  await page.goto("/wildlife?county=67000");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.locator(".wm-head h2")).toHaveText("臺南市");
  await expect(page.locator(".wm-animals li").first()).toContainText(
    "黑眶蟾蜍",
  );
  await expect(page.locator(".wm-animals li").first()).toContainText(
    "Asian common toad",
  );
  await expect(page.locator(".wm-big")).toContainText("筆收錄紀錄");
});

test("the 10 km grid is one switch away, keeps the old links working and comes back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/wildlife");
  await expect(page.locator(".wm svg")).toBeVisible();
  await page.getByRole("button", { name: "10 km grid" }).click();
  await expect.poll(() => page.url()).toContain("view=grid");
  await expect(
    page.locator(".atlas-map .map-canvas-shell[data-map-ready=true]"),
  ).toBeVisible();
  await expect(page.locator(".wm")).toHaveCount(0);
  await page.getByRole("button", { name: "By county" }).click();
  await expect(page.locator(".wm svg")).toBeVisible();
  await expect.poll(() => page.url()).not.toContain("view=grid");

  // A link saved before the county map existed carried a map mode.
  await page.goto("/wildlife?mode=points");
  await expect(
    page.locator(".atlas-map .map-canvas-shell[data-map-ready=true]"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "10 km grid" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("filters narrow the county map: one species leaves only the counties that have it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/wildlife?q=%E9%BB%91%E7%9C%B6");
  await expect(page.locator(".wm svg")).toBeVisible();
  await expect(page.locator(".wm-animals li")).toHaveCount(1);
  await expect(page.locator(".wm-animals li").first()).toContainText(
    "Asian common toad",
  );
  await expect(page.locator(".wm-big strong")).toHaveText("3,682");
});
