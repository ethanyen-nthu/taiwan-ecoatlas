import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const downloadOf = async (page: Page, name: string | RegExp) => {
  const started = page.waitForEvent("download");
  await page.getByRole("button", { name }).first().click();
  const download = await started;
  return { download, bytes: readFileSync(await download.path()) };
};
const wellFormed = (page: Page, text: string) =>
  page.evaluate(
    (svg) =>
      new DOMParser()
        .parseFromString(svg, "image/svg+xml")
        .querySelector("parsererror") === null,
    text,
  );

test.describe("charts as pictures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/environment/temperature-over-time");
    await expect(page.locator(".lc-svg").first()).toBeVisible();
  });

  test("the cite block offers each chart as PNG and SVG", async ({ page }) => {
    const block = page.locator("[data-cite-charts]");
    await expect(block).toBeVisible();
    await expect(block.locator("li").first()).not.toBeEmpty();
    const charts = await page.locator("main [data-chart]").count();
    expect(charts).toBeGreaterThan(0);
    await expect(block.locator("li")).toHaveCount(charts);
    await expect(
      block.getByRole("button", { name: /Download SVG/ }),
    ).toHaveCount(charts);
    await expect(
      block.getByRole("button", { name: /Download PNG/ }),
    ).toHaveCount(charts);
  });

  test("the SVG is well formed, carries the chart, its key and the source line, and needs no stylesheet", async ({
    page,
  }) => {
    const { download, bytes } = await downloadOf(page, "Download SVG: ");
    expect(download.suggestedFilename()).toMatch(
      /^taiwan-ecoatlas-.*-chart-1\.svg$/,
    );
    const svg = bytes.toString("utf8");
    expect(await wellFormed(page, svg)).toBe(true);
    const first = page.locator("main [data-chart]").first();
    const lines = await first.locator(".lc-line").count();
    expect(lines).toBeGreaterThan(0);
    expect((svg.match(/<polyline/g) ?? []).length).toBeGreaterThanOrEqual(
      lines,
    );
    for (const label of await first.locator(".lc-legend li").allTextContents())
      expect(svg).toContain(label.trim());
    expect(svg).toContain("Source: Taiwan EcoAtlas");
    expect(svg).toContain("Underlying data:");
    expect(svg).toContain("Accessed");
    // A title that ends in a question mark is not given a second stop.
    expect(svg).not.toMatch(/[?？]\./);
    expect(svg).toContain(
      "taiwan-ecoatlas.vercel.app/environment/temperature-over-time",
    );
    // Styles are written onto the elements, so it looks right anywhere.
    expect(svg).not.toContain("var(--");
    expect(svg).not.toMatch(/class="/);
    expect(svg).not.toContain("color(srgb");
    expect(svg).toMatch(/stroke:rgb\(/);
    // Marks that only exist while a pointer is on the chart are not in it.
    expect(svg).not.toContain("lc-pick");
  });

  test("the PNG is a real picture, twice the page's size", async ({ page }) => {
    const { download, bytes } = await downloadOf(page, "Download PNG: ");
    expect(download.suggestedFilename()).toMatch(/-chart-1\.png$/);
    expect([...bytes.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    expect(width).toBeGreaterThanOrEqual(1280);
    expect(height).toBeGreaterThan(600);
    expect(bytes.length).toBeGreaterThan(8000);
  });

  test("turning the source lines off removes them but keeps the name of the atlas", async ({
    page,
  }) => {
    await page
      .getByRole("checkbox", { name: /source lines at the bottom/ })
      .uncheck();
    const { bytes } = await downloadOf(page, "Download SVG: ");
    const svg = bytes.toString("utf8");
    expect(svg).not.toContain("Underlying data:");
    expect(svg).not.toContain("Accessed");
    expect(svg).toContain("Taiwan EcoAtlas");
  });

  test("it reads in Chinese and the file follows the language", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "繁中" }).click();
    const { bytes } = await downloadOf(page, /下載 SVG/);
    const svg = bytes.toString("utf8");
    expect(await wellFormed(page, svg)).toBe(true);
    expect(svg).toContain("來源");
    expect(svg).toContain("資料來源");
    expect(svg).toContain("檢索日期");
  });
});

test("the air chart offers a picture with its key and the source", async ({
  page,
}) => {
  await page.goto("/environment/air-over-time");
  await expect(page.locator(".air-svg").first()).toBeVisible();
  const { bytes } = await downloadOf(page, /Download SVG/);
  const svg = bytes.toString("utf8");
  expect(await wellFormed(page, svg)).toBe(true);
  expect(svg).toContain("National average");
  expect(svg).toContain("Underlying data:");
  expect(svg).toContain("<polyline");
});

test("a page with no chart offers no chart pictures", async ({ page }) => {
  await page.goto("/environment/weather");
  await expect(page.locator("[data-cite]")).toBeVisible();
  await expect(page.locator("[data-cite-charts]")).toHaveCount(0);
});

test("the chart block passes automated WCAG checks and fits at phone widths", async ({
  page,
}) => {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/environment/temperature-over-time");
    const block = page.locator("[data-cite-charts]");
    await expect(block).toBeVisible();
    await block.scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page })
      .include("[data-cite]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
      `at ${width}px`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}px`,
    ).toBe(true);
  }
});
