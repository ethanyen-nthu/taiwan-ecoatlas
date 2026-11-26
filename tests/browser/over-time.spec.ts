import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const tabsNav = (page: Page) =>
  page.getByRole("navigation", { name: "Pages in this subject" });

const subjects = [
  {
    path: "/environment",
    current: /Live map/,
    others: [/Air over time/, /Rivers over time/],
  },
  { path: "/forests", current: /Land-cover map/, others: [/Forest over time/] },
  { path: "/wildlife", current: /Roadkill map/, others: [/Year by year/] },
  {
    path: "/culture",
    current: /Village map/,
    others: [/Sixteen peoples/, /Population over time/],
  },
  {
    path: "/urban",
    current: /Parks and trees map/,
    others: [/Parks over time/],
  },
  { path: "/plants", current: /Tree kinds/, others: [/Counted year by year/] },
];

for (const subject of subjects) {
  test(`${subject.path} shows a visible tab strip with its current page marked`, async ({
    page,
  }) => {
    await page.goto(subject.path);
    const nav = tabsNav(page);
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link")).toHaveCount(subject.others.length + 1);
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('a[aria-current="page"]')).toContainText(
      subject.current,
    );
    for (const other of subject.others) {
      const link = nav.getByRole("link", { name: other });
      const box = await link.boundingBox();
      // Every tab is a large, tappable block, not a line of small text.
      expect(box!.height, String(other)).toBeGreaterThanOrEqual(44);
      await link.click();
      await expect(page.locator("main h1")).toBeVisible();
      await expect(
        tabsNav(page).locator('a[aria-current="page"]'),
      ).toContainText(other);
      await page.goBack();
      await expect(tabsNav(page)).toBeVisible();
    }
  });
}

const pages = [
  {
    path: "/environment/rivers-over-time",
    tab: /Rivers over time/,
    h1: "Are Taiwan’s rivers cleaner?",
    zh: "臺灣的河川有變乾淨嗎",
    fact: "66 → 2",
    sources: 8,
    bars: 2,
  },
  {
    path: "/forests/over-time",
    tab: /Forest over time/,
    h1: "Has Taiwan’s forest grown?",
    zh: "臺灣的森林有變多嗎",
    fact: "58.53% → 60.71%",
    sources: 5,
    bars: 2,
  },
  {
    path: "/wildlife/year-by-year",
    tab: /Year by year/,
    h1: /Is roadkill getting worse/,
    zh: "路死變多了嗎",
    fact: "1,499 → 5,013",
    sources: 1,
    bars: 1,
    heat: 3,
  },
  {
    path: "/culture/population",
    tab: /Population over time/,
    h1: /How many Indigenous Taiwanese/,
    zh: "臺灣原住民有多少人",
    fact: "519,984 → 629,456",
    sources: 3,
    bars: 4,
  },
  {
    path: "/urban/over-time",
    tab: /Parks over time/,
    h1: "When did Taipei build its parks?",
    zh: "臺北的公園是什麼時候建的",
    fact: "285",
    sources: 1,
    bars: 2,
  },
  {
    path: "/plants/surveys",
    tab: /Counted year by year/,
    h1: /Are Taipei’s trees increasing/,
    zh: "臺北的樹逐年增加嗎",
    fact: "95%",
    sources: 2,
    bars: 2,
  },
];

for (const item of pages) {
  test(`${item.path}: a headline, three figures, charts with exact numbers, notes and sources`, async ({
    page,
  }) => {
    await page.goto(item.path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      item.h1,
    );
    await expect(tabsNav(page).locator('a[aria-current="page"]')).toContainText(
      item.tab,
    );
    await expect(page.locator(".tp-facts li")).toHaveCount(3);
    await expect(page.locator(".tp-facts")).toContainText(item.fact);

    const bars = page.locator(".bars [role=img]");
    await expect(bars).toHaveCount(item.bars);
    for (let i = 0; i < item.bars; i += 1) {
      const label = await bars.nth(i).getAttribute("aria-label");
      expect(label!.length).toBeGreaterThan(30);
      expect(label).not.toMatch(/undefined|NaN/);
    }
    if (item.heat) await expect(page.locator(".heat")).toHaveCount(item.heat);

    // Every chart that has a table behind it lists real numbers.
    const summaries = page.locator(".tp-table summary");
    const tables = await summaries.count();
    for (let i = 0; i < tables; i += 1) await summaries.nth(i).click();
    const cells = await page.locator(".tp-table td").allTextContents();
    expect(cells.length).toBeGreaterThan(3);
    await expect(page.locator("main")).not.toContainText(/undefined|NaN/);

    await expect(page.locator(".tp-notes li")).not.toHaveCount(0);
    expect(await page.locator(".tp-class li").count()).toBeGreaterThanOrEqual(
      3,
    );
    const links = page.locator(".tp-sources a");
    expect(await links.count()).toBe(item.sources);
    for (let i = 0; i < item.sources; i += 1)
      await expect(links.nth(i)).toHaveAttribute("href", /^https:\/\//);
  });

  test(`${item.path} reads in Traditional Chinese`, async ({ page }) => {
    await page.goto(item.path);
    await page.getByRole("button", { name: "繁中", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      item.zh,
    );
    await expect(page.locator("main")).not.toContainText(/undefined|NaN/);
    await expect(
      page.locator('nav.section-tabs a[aria-current="page"]'),
    ).toBeVisible();
  });

  test(`${item.path} passes automated WCAG checks and does not overflow`, async ({
    page,
  }) => {
    for (const size of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await page.goto(item.path);
      await expect(page.locator("main h1")).toBeVisible();
      const summaries = page.locator(".tp-table summary");
      const count = await summaries.count();
      for (let i = 0; i < count; i += 1) await summaries.nth(i).click();
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
}

test("the wildlife page shows the Lienchiang jump and the gap months, never as zero", async ({
  page,
}) => {
  await page.goto("/wildlife/year-by-year");
  const counties = page.locator(".heat").first();
  const row = counties.locator("tbody tr", { hasText: "Lienchiang" });
  await expect(row).toContainText("1,157");
  await expect(row).toContainText("12");
  const months = page.locator(".heat").nth(2);
  const november = months.locator("tbody tr", { hasText: "November" });
  await expect(november.locator("td").first()).toHaveAttribute(
    "data-empty",
    "true",
  );
  await expect(november.locator("td").first()).toContainText("no records");
  await expect(page.locator(".tp-notes")).toContainText("Lienchiang");
  await expect(page.locator(".tp-facts")).toContainText("71%");
});

test("the forest page keeps the atlas map apart from the inventories", async ({
  page,
}) => {
  await page.goto("/forests/over-time");
  const chart = page.locator(".bars [role=img]").first();
  await expect(chart).toHaveAttribute("aria-label", /58\.53%/);
  await expect(chart).toHaveAttribute("aria-label", /60\.71%/);
  await expect(chart).toHaveAttribute("aria-label", /58\.43%/);
  await expect(page.locator(".bars-bar[data-tone=hatched]")).toHaveCount(1);
  await expect(page.locator(".tp-notes")).toContainText("not a third point");
});

test("the tree-survey page draws 2017 to 2021 as gaps", async ({ page }) => {
  await page.goto("/plants/surveys");
  const label = await page
    .locator(".bars [role=img]")
    .first()
    .getAttribute("aria-label");
  for (const year of ["2017", "2018", "2019", "2020", "2021"])
    expect(label).toContain(`${year}: no records`);
  await expect(page.locator(".bars-col[data-empty=true]")).toHaveCount(5);
});

test("the population page says what the registry counts and what it leaves out", async ({
  page,
}) => {
  await page.goto("/culture/population");
  await expect(page.locator(".tp-notes")).toContainText("registered");
  await expect(page.locator(".tp-notes")).toContainText("26 peoples");
  await expect(page.locator(".tp-notes")).toContainText("23 October 2025");
});

test("the wildlife tables fit a phone in both languages, every column in view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wildlife/year-by-year");
  for (const language of ["en", "zh"]) {
    if (language === "zh")
      await page.getByRole("button", { name: "繁中", exact: true }).click();
    const widths = await page
      .locator(".heat-wrap")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.scrollWidth - node.clientWidth),
      );
    expect(widths, language).toHaveLength(3);
    for (const extra of widths) expect(extra, language).toBeLessThanOrEqual(1);
  }
});
