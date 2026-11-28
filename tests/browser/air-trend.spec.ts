import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the environment page has a tab for the long-run air record", async ({
  page,
}) => {
  await page.goto("/environment");
  await page
    .getByRole("navigation", { name: "Pages in this subject" })
    .getByRole("link", { name: /Air over time/ })
    .click();
  await expect(page).toHaveURL(/\/environment\/air-over-time$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Has Taiwan’s air improved?" }),
  ).toBeVisible();
});

test("the chart reads year by year with the keyboard, a visible gap and exact numbers", async ({
  page,
}) => {
  await page.goto("/environment/air-over-time");
  const slider = page.locator(".air-scrub");
  await expect(slider).toHaveCount(1);
  await expect(page.locator(".air-gap-label")).toContainText("2020–21");
  await slider.focus();
  await expect(page.locator(".air-tip")).toContainText("24.0");
  for (let i = 0; i < 6; i += 1) await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "2019");
  await expect(page.locator(".air-tip")).toContainText("16.2");
  await expect(page.locator(".air-tip")).toContainText("19.6");
  // The next plotted year after 2019 is 2022: the gap is never read as data.
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "2022");
  await slider.press("End");
  await expect(page.locator(".air-tip")).toContainText("12.8");
  await expect(page.locator(".air-tip")).toContainText("14.8");
  await slider.press("Escape");
  await expect(page.locator(".air-tip")).toHaveCount(0);
  const box = await slider.boundingBox();
  await page.mouse.move(box!.x + 60, box!.y + box!.height / 2);
  await expect(page.locator(".air-tip")).toContainText("2013");
  const national = page.getByRole("region", {
    name: "Annual average PM2.5 in Taiwan",
  });
  await national.locator("summary").click();
  const rows = national.locator(".tp-table tbody tr");
  await expect(rows).toHaveCount(13);
  await expect(rows.filter({ hasText: "2020" })).toContainText("Not plotted");
  await expect(rows.filter({ hasText: "2025" })).toContainText("12.8");
  await expect(page.locator(".tp-facts")).toContainText("−47%");
  const links = page.locator(".tp-sources a");
  expect(await links.count()).toBeGreaterThanOrEqual(10);
  await expect(links.first()).toHaveAttribute("href", /^https:\/\//);
});

test("the tooltip stays below the legend for every year, also on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/environment/air-over-time");
  const slider = page.locator(".air-scrub");
  await slider.focus();
  const legend = await page.locator(".air-legend").boundingBox();
  for (let i = 0; i < 11; i += 1) {
    const tip = await page.locator(".air-tip").boundingBox();
    expect(tip!.y, `step ${i}`).toBeGreaterThanOrEqual(
      legend!.y + legend!.height - 1,
    );
    expect(tip!.x, `step ${i}`).toBeGreaterThanOrEqual(0);
    expect(tip!.x + tip!.width, `step ${i}`).toBeLessThanOrEqual(390);
    await slider.press("ArrowRight");
  }
});

test("the record reads in Traditional Chinese", async ({ page }) => {
  await page.goto("/environment/air-over-time");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "臺灣的空氣有變好嗎",
  );
  await expect(page.locator(".air-gap-label")).toContainText("未繪出");
  await expect(page.locator("main")).not.toContainText("undefined");
});

test("the air record passes automated WCAG checks and does not overflow", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/environment/air-over-time");
    await expect(page.locator("main h1")).toBeVisible();
    for (const summary of await page.locator(".tp-table summary").all()) {
      await summary.click();
    }
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
      `at ${size.width}px`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
      `overflows at ${size.width}px`,
    ).toBeLessThanOrEqual(1);
  }
});
