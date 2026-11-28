import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const url = "/tour";
type Stop =
  | "start"
  | "air"
  | "warm"
  | "forest"
  | "roadkill"
  | "people"
  | "taipei"
  | "yours";

const goTo = async (page: Page, id: Stop) =>
  page
    .locator(`#stop-${id}`)
    .evaluate((node) => node.scrollIntoView({ block: "center" }));

const hatched = (page: Page) => page.locator(".tour-county[data-empty]");

test("the tour opens on its first stop with eight stops to follow", async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.locator("main h1")).toContainText("Six things");
  await expect(page.locator(".tour-progress a")).toHaveCount(8);
  await expect(page.locator(".tour-progress a[aria-current=step]")).toHaveCount(
    1,
  );
  await expect(page.locator(".tour-now")).toHaveText("22 counties and cities");
  await expect(page.locator(".tour-county")).toHaveCount(22);
  await expect(page.locator("main")).not.toContainText(/undefined|NaN/);
});

test("the map follows the text as each stop scrolls into view", async ({
  page,
}) => {
  await page.goto(url);
  await goTo(page, "air");
  await expect(page.locator(".tour-now")).toContainText("PM2.5");
  await expect(
    page.locator(".tour-progress a[aria-current=step]"),
  ).toHaveAttribute("aria-label", /Air/);
  await expect(hatched(page)).toHaveCount(0);

  // Penghu and Lienchiang have no temperature model values: hatched, not zero.
  await goTo(page, "warm");
  await expect(page.locator(".tour-now")).toContainText("temperature");
  await expect(hatched(page)).toHaveCount(2);
  await expect(page.locator('.tour-county[data-code="10016"]')).toHaveAttribute(
    "data-empty",
    "",
  );
  await expect(page.locator(".tour-legend")).toContainText("No data");

  // Three counties were not covered by the land-cover map.
  await goTo(page, "forest");
  await expect(page.locator(".tour-now")).toContainText("Forest share");
  await expect(hatched(page)).toHaveCount(3);

  await goTo(page, "roadkill");
  await expect(page.locator(".tour-now")).toContainText("wildlife reports");
  await expect(hatched(page)).toHaveCount(0);

  await goTo(page, "people");
  await expect(page.locator(".tour-dots")).toHaveAttribute("data-on", "true");

  await goTo(page, "taipei");
  await expect(page.locator(".tour-dots")).toHaveAttribute("data-on", "false");
  await expect(page.locator(".tour-outline")).toHaveCount(1);
});

test("the big numbers are counted from the data", async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("#stop-air .tour-figure strong")).toHaveText(
    "−47%",
  );
  await expect(page.locator("#stop-warm .tour-figure strong")).toHaveText(
    /^\+0\.8\s°C$/,
  );
  await expect(page.locator("#stop-forest .tour-figure strong")).toHaveText(
    "75%",
  );
  await expect(page.locator("#stop-roadkill .tour-figure strong")).toHaveText(
    "37%",
  );
  await expect(page.locator("#stop-people .tour-figure strong")).toHaveText(
    "16",
  );
  await expect(page.locator("#stop-taipei .tour-figure strong")).toHaveText(
    /^\d{2},\d{3}$/,
  );
  // Every finding says what its data cannot tell you.
  await expect(page.locator(".tour-limit")).toHaveCount(6);
});

test("each finding has a table of county figures, with a dash for a gap", async ({
  page,
}) => {
  await page.goto(url);
  const warm = page.locator("#stop-warm .tour-table");
  await warm.locator("summary").click();
  await expect(warm.locator("tbody tr")).toHaveCount(22);
  const dashes = warm.locator("tbody td", { hasText: "—" });
  await expect(dashes).toHaveCount(2);
  await expect(
    warm.locator("tbody tr").filter({ hasText: "Penghu" }),
  ).toContainText("no data");
  const roadkill = page.locator("#stop-roadkill .tour-table");
  await roadkill.locator("summary").click();
  await expect(roadkill.locator("tbody tr").first()).toContainText("Tainan");
  await expect(roadkill.locator("tbody tr").first()).toContainText("1,545");
});

test("the progress dots jump to a stop", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("link", { name: "3. Temperature" }).click();
  await expect(page).toHaveURL(/#stop-warm$/);
  await expect(page.locator(".tour-now")).toContainText("temperature");
});

test("picking a county outlines it and links to its page", async ({ page }) => {
  await page.goto(url);
  await goTo(page, "yours");
  const link = page.locator("#stop-yours .button");
  await expect(link).toHaveAttribute("href", "/county");
  await page.selectOption("#tour-county", { label: "Hualien County" });
  await expect(link).toHaveAttribute("href", "/county/10015");
  await expect(link).toContainText("Open Hualien County");
  await expect(page.locator(".tour-now")).toHaveText("Hualien County");
  const fill = await page
    .locator('.tour-county[data-code="10015"]')
    .evaluate((node) => getComputedStyle(node).fill);
  expect(fill).toBe("rgb(22, 32, 43)");
});

test("the tour reads in Traditional Chinese", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("button", { name: "繁中" }).click();
  await expect(page.locator("main h1")).toContainText("六件事");
  await goTo(page, "warm");
  await expect(page.locator(".tour-now")).toContainText("年平均氣溫變化");
  await expect(page.locator("#stop-warm .tour-limit")).toContainText(
    "沒辦法告訴你",
  );
  await expect(page.locator(".tour-island").first()).toHaveText(
    /金門|澎湖|連江/,
  );
});

test("people who prefer less motion get no colour transitions", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url);
  const duration = await page
    .locator(".tour-county")
    .first()
    .evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(duration).toBe("0s");
  await context.close();
});

test("the home page and search both lead to the tour", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Take the five-minute tour" }).click();
  await expect(page).toHaveURL(/\/tour$/);
  await page.goto("/search?q=five minutes");
  await expect(page.locator('.sr-group a[href="/tour"]').first()).toBeVisible();
});

test("the tour passes automated WCAG checks and does not overflow", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(url);
    for (const id of ["start", "warm", "forest", "people", "yours"] as const) {
      await goTo(page, id);
      await expect(
        page.locator(".tour-progress a[aria-current=step]"),
      ).toHaveAttribute("href", `#stop-${id}`);
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
        `${id} at ${size.width}px`,
      ).toEqual([]);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
      `overflow at ${size.width}px`,
    ).toBeLessThanOrEqual(1);
  }
});
