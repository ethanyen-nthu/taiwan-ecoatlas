import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const url = "/environment/temperature-over-time";

const noOverflow = async (page: Page, label: string) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
    label,
  ).toBeLessThanOrEqual(1);

test("the page gives a headline, three figures, two charts, the county bars and sources", async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Is Taiwan getting warmer?",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Pages in this subject" })
      .locator('a[aria-current="page"]'),
  ).toContainText("Temperature over time");

  const facts = page.locator(".tp-facts li");
  await expect(facts).toHaveCount(3);
  await expect(facts.nth(0)).toContainText(/^\+\d\.\d °C/);
  await expect(facts.nth(1).locator(".tp-num")).toHaveText(/^(19|20)\d\d$/);
  await expect(facts.nth(2)).toContainText("Summers (June–August)");
  await expect(facts.nth(2)).toContainText("Winters:");

  const charts = page.locator(".lc-svg[role=img]");
  await expect(charts).toHaveCount(2);
  for (let i = 0; i < 2; i += 1) {
    const label = await charts.nth(i).getAttribute("aria-label");
    expect(label!.length).toBeGreaterThan(60);
    expect(label).not.toMatch(/undefined|NaN|null/);
  }

  // It says what it is, and what it leaves out.
  await expect(page.locator(".tp-notes")).toContainText(
    "A model, not a thermometer",
  );
  await expect(page.locator(".tp-notes")).toContainText("Penghu County");
  await expect(page.locator(".tp-notes")).toContainText("Lienchiang County");

  // Credit is given where the numbers are shown, and again in the sources.
  const credit = page.locator(".tt-credit a");
  await expect(credit).toHaveText("Weather data by Open-Meteo.com");
  await expect(credit).toHaveAttribute("href", "https://open-meteo.com/");
  await expect(page.locator(".tp-sources li")).toHaveCount(4);
  await expect(page.locator(".tp-sources")).toContainText("CC BY 4.0");
  await expect(page.locator("main")).not.toContainText(/undefined|NaN/);
});

test("the chart is readable from the keyboard, year by year", async ({
  page,
}) => {
  await page.goto(url);
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await expect(page.locator(".lc-tip").first()).toContainText("1950");
  await slider.press("ArrowRight");
  await expect(page.locator(".lc-tip").first()).toContainText("1951");
  await expect(slider).toHaveAttribute("aria-valuetext", /^1951: .*°C/);
  await slider.press("End");
  await expect(page.locator(".lc-tip").first()).toContainText("2025");
  await expect(slider).toHaveAttribute("aria-valuenow", "2025");
  await slider.press("Escape");
  await expect(page.locator(".lc-tip")).toHaveCount(0);
});

test("a county can be added to the chart and its numbers join the table", async ({
  page,
}) => {
  await page.goto(url);
  const select = page.getByLabel("Add one county to the chart");
  // Counties the model has no values for are listed but cannot be picked.
  await expect(
    select.locator("option", { hasText: "Penghu County" }),
  ).toBeDisabled();
  await expect(
    select.locator("option", { hasText: "Penghu County" }),
  ).toContainText("no data in this model");

  await expect(page.locator(".lc-legend").first()).not.toContainText(
    "Taipei City",
  );
  await select.selectOption({ label: "Taipei City" });
  await expect(page.locator(".lc-legend").first()).toContainText("Taipei City");
  const table = page.locator(".tp-panel").first().locator("table");
  await page.locator(".tp-panel").first().locator("summary").click();
  await expect(table.locator("thead th")).toHaveCount(5);
  await expect(table.locator("thead th").last()).toContainText("Taipei City");
  // Every year has a value for a county the model covers.
  const cells = await table.locator("tbody tr td:last-child").allInnerTexts();
  expect(cells).toHaveLength(76);
  expect(cells.every((cell) => /^\d\d\.\d$/.test(cell))).toBe(true);
});

test("the county bars run from the biggest rise down and leave gaps as gaps", async ({
  page,
}) => {
  await page.goto(url);
  const rows = page.locator(".tt-bars li");
  await expect(rows).toHaveCount(22);
  const empty = page.locator(".tt-bars li[data-empty]");
  await expect(empty).toHaveCount(2);
  await expect(empty.first().locator(".tt-num")).toHaveText("no data");
  await expect(empty.first().locator(".tt-fill")).toHaveCount(0);
  // The empty rows are last.
  expect(await rows.nth(21).getAttribute("data-empty")).not.toBeNull();
  expect(await rows.nth(19).getAttribute("data-empty")).toBeNull();
  const numbers = (
    await page.locator(".tt-bars li:not([data-empty]) .tt-num").allInnerTexts()
  ).map((text) => Number(text.replace("−", "-")));
  expect(numbers).toHaveLength(20);
  expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);
});

test("the numbers download as CSV with gaps left empty", async ({ page }) => {
  await page.goto(url);
  const buttons = page
    .locator("[data-cite]")
    .getByRole("button", { name: /Download CSV/ });
  await expect(buttons).toHaveCount(3);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    buttons.first().click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    "taiwan-ecoatlas-environment-temperature-over-time-1.csv",
  );
  const text = await readFile((await download.path())!, "utf8");
  const lines = text.replace("﻿", "").split("\r\n");
  expect(lines[0]).toMatch(/^Year,That year \(°C\),10-year average/);
  const first = lines[1].split(",");
  expect(first[0]).toBe("1950");
  expect(first[1]).toMatch(/^\d\d\.\d$/);
  // The ten-year average cannot start before the tenth year: empty, not zero.
  expect(first[2]).toBe("");
  expect(lines[10].split(",")[2]).toMatch(/^\d\d\.\d$/);
  expect(text).not.toMatch(/NaN|undefined|—/);
});

test("the page reads in Traditional Chinese", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "臺灣有變暖嗎？",
  );
  await expect(page.locator(".tt-bars")).toContainText("澎湖縣");
  await expect(
    page.locator(".tt-bars li[data-empty] .tt-num").first(),
  ).toHaveText("無數值");
  await expect(page.locator(".tt-credit")).toContainText(
    "氣象資料：Open-Meteo.com",
  );
  await expect(page.locator("main")).not.toContainText(/undefined|NaN/);
});

test("it passes automated WCAG checks and does not overflow at three widths", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(url);
    await expect(page.locator("main h1")).toBeVisible();
    for (const summary of await page.locator(".tp-table summary").all())
      await summary.click();
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
    await noOverflow(page, `overflows at ${size.width}px`);
  }
});
