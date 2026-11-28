import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const temperature = "/environment/temperature-over-time";
const air = "/environment/air-over-time";

const noOverflow = async (page: Page, label: string) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
    label,
  ).toBeLessThanOrEqual(1);

const panelOf = (page: Page, heading: string): Locator =>
  page
    .locator("section.tp-panel")
    .filter({ has: page.getByRole("heading", { name: heading }) });

const year = (panel: Locator) => panel.locator(".ym-year");

test("the temperature map shows 2025, steps by keyboard, and plays and pauses", async ({
  page,
}) => {
  await page.goto(temperature);
  const panel = panelOf(page, "Watch the counties warm up");
  await expect(year(panel)).toHaveText("2025");
  await expect(panel.locator(".ym-summary")).toContainText(
    "Average of 20 counties",
  );
  // Penghu and Lienchiang have no model values: hatched, not coloured.
  await expect(panel.locator(".ym-county[data-empty]")).toHaveCount(2);
  await expect(panel.locator(".ym-island-name")).toHaveCount(3);

  const slider = panel.getByRole("slider", { name: "Year" });
  await slider.focus();
  await slider.press("ArrowLeft");
  await expect(year(panel)).toHaveText("2024");
  await slider.press("Home");
  await expect(year(panel)).toHaveText("1950");
  await expect(slider).toHaveAttribute(
    "aria-valuetext",
    /^1950, Average of 20/,
  );

  await panel.getByRole("button", { name: "Play through the years" }).click();
  await expect
    .poll(async () => Number(await year(panel).textContent()))
    .toBeGreaterThan(1951);
  await panel.getByRole("button", { name: "Pause" }).click();
  const stopped = await year(panel).textContent();
  await page.waitForTimeout(900);
  await expect(year(panel)).toHaveText(stopped!);
});

test("picking a county gives its figure, its modelled temperature and a gap for Penghu", async ({
  page,
}) => {
  await page.goto(temperature);
  const panel = panelOf(page, "Watch the counties warm up");
  await panel.getByRole("slider", { name: "Year" }).press("Home");
  const pick = panel.getByLabel("Look at one county");
  await pick.selectOption({ label: "Taitung County" });
  const readout = panel.locator(".ym-readout");
  await expect(readout).toContainText("Taitung County");
  await expect(readout).toContainText(/[+−]?\d\.\d °C/);
  await expect(readout).toContainText("Modelled temperature that year");
  await expect(readout.locator(".ym-spark")).toBeVisible();

  await pick.selectOption({ label: "Penghu County" });
  await expect(readout).toContainText("No value for this year");
  await expect(readout.locator(".ym-spark")).toHaveCount(0);
  await expect(readout).not.toContainText(/NaN|undefined/);
});

test("summer and winter change the scale, and winter starts a year later", async ({
  page,
}) => {
  await page.goto(temperature);
  const panel = panelOf(page, "Watch the counties warm up");
  await expect(panel.locator(".ym-legend-title")).toContainText("1950–1979");
  await panel.getByRole("button", { name: "Winter" }).click();
  await expect(panel.locator(".ym-legend-title")).toContainText("1951–1979");
  await expect(panel.locator(".ym-slider-ends")).toContainText("1951");
  await panel.getByRole("button", { name: "Summer" }).click();
  await expect(panel.locator(".ym-legend-title")).toContainText("1950–1979");
  await expect(year(panel)).toHaveText("2025");
});

test("then and now compares two decades side by side and gives the difference", async ({
  page,
}) => {
  await page.goto(temperature);
  const panel = panelOf(page, "Watch the counties warm up");
  await panel.getByRole("button", { name: "Then and now" }).click();
  await expect(panel.locator(".ym-svg")).toHaveCount(2);
  await expect(panel.getByLabel("Earlier")).toHaveValue("1950-1959");
  await expect(panel.getByLabel("Later")).toHaveValue("2020-2025");
  await panel.getByLabel("Look at one county").selectOption({
    label: "Taipei City",
  });
  const readout = panel.locator(".ym-readout");
  await expect(readout).toContainText("1950–59:");
  await expect(readout).toContainText("2020–25:");
  await expect(readout).toContainText(/Difference: \+\d\.\d °C/);
  await panel.getByLabel("Earlier").selectOption("1990-1999");
  await expect(readout).toContainText("1990–99:");
  await panel.getByRole("button", { name: "Year by year" }).click();
  await expect(panel.locator(".ym-svg")).toHaveCount(1);
});

test("the numbers table lists every county and shows a dash where there is no value", async ({
  page,
}) => {
  await page.goto(temperature);
  const panel = panelOf(page, "Watch the counties warm up");
  await panel.locator(".tp-table summary").click();
  const rows = panel.locator(".tp-table tbody tr");
  await expect(rows).toHaveCount(22);
  await expect(rows.filter({ hasText: "Penghu County" })).toContainText("—");
  await expect(panel.locator(".tp-table")).not.toContainText(/NaN|undefined/);
});

test("the air page has a five-year county PM2.5 map with the official figures", async ({
  page,
}) => {
  await page.goto(air);
  const panel = panelOf(page, "Where the air is cleaner, county by county");
  await expect(year(panel)).toHaveText("2025");
  await expect(panel.locator(".ym-summary")).toContainText("12.8 µg/m³");
  await expect(panel.locator(".ym-county[data-empty]")).toHaveCount(0);
  await panel.getByLabel("Look at one county").selectOption({
    label: "Yunlin County",
  });
  await expect(panel.locator(".ym-readout")).toContainText("18.2 µg/m³");
  await panel.getByRole("slider", { name: "Year" }).press("Home");
  await expect(year(panel)).toHaveText("2021");
  await expect(panel.locator(".ym-readout")).toContainText("21.4 µg/m³");
  await expect(panel.locator(".tp-caption")).toContainText(
    "should not be joined into one line",
  );
});

test("the maps read in Traditional Chinese", async ({ page }) => {
  await page.goto(temperature);
  await page.getByRole("button", { name: "繁中" }).click();
  const panel = panelOf(page, "看各縣市如何變暖");
  await expect(panel.getByRole("button", { name: "今昔對照" })).toBeVisible();
  await panel.getByLabel("查看一個縣市").selectOption({ label: "臺東縣" });
  await expect(panel.locator(".ym-readout")).toContainText("模型氣溫");
  await expect(panel.locator(".ym-island-name").first()).toHaveText(
    /金門|澎湖|連江/,
  );
  await panel.getByRole("button", { name: "今昔對照" }).click();
  await expect(panel.locator(".ym-readout")).toContainText("差異");
});

test("both pages pass automated WCAG checks and do not overflow at three widths", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(size);
    for (const url of [temperature, air]) {
      await page.goto(url);
      await expect(page.locator(".ym").first()).toBeVisible();
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
        `${url} at ${size.width}px`,
      ).toEqual([]);
      await noOverflow(page, `${url} overflows at ${size.width}px`);
    }
  }
});
