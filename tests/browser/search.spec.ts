import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const noOverflow = async (page: Page, label: string) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
    label,
  ).toBeLessThanOrEqual(1);

test("the header button opens search with the box ready to type in", async ({
  page,
}) => {
  await page.goto("/environment/weather");
  await page.getByRole("link", { name: "Search the atlas" }).click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Search the atlas" }),
  ).toBeVisible();
  await expect(page.getByLabel("Search for")).toBeFocused();
  // The empty page offers examples and says how much can be found.
  await expect(page.getByRole("button", { name: "Taitung" })).toBeVisible();
  await expect(page.locator(".sr-try .sr-note")).toContainText(
    /[\d,]{3,} things can be found/,
  );
});

test("typing finds pages, counties, peoples and trees, grouped, and the link works", async ({
  page,
}) => {
  await page.goto("/search");
  const box = page.getByLabel("Search for");
  await box.fill("taitung");
  await expect(page.getByRole("status")).toContainText(/\d+ results?/);
  await expect(
    page.getByRole("heading", { level: 2, name: /^Counties and cities/ }),
  ).toBeVisible();
  // The address follows the box so a search can be shared.
  await expect(page).toHaveURL(/\/search\?q=taitung$/);

  await box.fill("台東");
  await expect(
    page.locator(".sr-group a", { hasText: "Taitung County" }).first(),
  ).toBeVisible();

  await box.fill("amis");
  const amis = page
    .getByRole("region", { name: /Indigenous peoples/ })
    .getByRole("link")
    .first();
  await expect(amis).toContainText("Amis");
  await amis.click();
  await expect(page).toHaveURL(/\/culture\/peoples\/amis$/);
});

test("a shared link fills the box, a second word narrows, and nothing found says so", async ({
  page,
}) => {
  await page.goto("/search?q=reservoir");
  await expect(page.getByLabel("Search for")).toHaveValue("reservoir");
  await expect(
    page.locator(".sr-group a", { hasText: "Reservoirs now" }),
  ).toBeVisible();

  const count = async () =>
    Number(
      (await page.getByRole("status").textContent())?.match(/\d+/)?.[0] ?? 0,
    );
  await page.getByLabel("Search for").fill("taitung");
  await expect(page.getByRole("status")).toContainText(/\d+ results/);
  const wide = await count();
  await page.getByLabel("Search for").fill("taitung amis");
  await expect(page.getByRole("status")).toContainText(/\d+ results?/);
  const narrow = await count();
  expect(narrow).toBeGreaterThan(0);
  expect(narrow).toBeLessThan(wide);

  await page.getByLabel("Search for").fill("zzzzqq");
  await expect(page.getByRole("status")).toHaveText("No results");
  await expect(page.locator(".sr-empty")).toContainText("Nothing matches");
  await expect(page.locator(".sr-group")).toHaveCount(0);
});

test("long groups show eight, then all on request", async ({ page }) => {
  await page.goto("/search?q=e");
  const group = page.locator(".sr-group").first();
  await expect(group).toBeVisible();
  const more = group.getByRole("button", { name: /^Show all \d+/ });
  await expect(more).toBeVisible();
  await expect(group.locator("li")).toHaveCount(8);
  await more.click();
  expect(await group.locator("li").count()).toBeGreaterThan(8);
  await expect(more).toHaveCount(0);
});

test("it reads in Traditional Chinese, searches in Chinese and shows both titles", async ({
  page,
}) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "繁中" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "搜尋平台" }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("榕樹");
  await expect(page.getByRole("status")).toContainText(/找到 \d+ 筆/);
  const tree = page
    .getByRole("region", { name: /樹木/ })
    .getByRole("link")
    .first();
  await expect(tree).toContainText("榕樹");
  // The other language sits beside the title, smaller.
  await expect(tree.locator("small")).not.toHaveText("");
  await page.getByRole("searchbox").fill("zzzzqq");
  await expect(page.locator(".sr-empty")).toContainText("沒有符合");
});

test("it can be used from the keyboard alone", async ({ page }) => {
  await page.goto("/search?q=weather");
  await page.getByLabel("Search for").press("Tab");
  const first = page.locator(".sr-group a").first();
  await expect(first).toBeFocused();
  const href = await first.getAttribute("href");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${href}$`));
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
    for (const url of ["/search", "/search?q=tai", "/search?q=zzzzqq"]) {
      await page.goto(url);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.getByLabel("Search for")).toBeVisible();
      if (url.includes("tai"))
        await expect(page.locator(".sr-group").first()).toBeVisible();
      if (url.includes("zzzz"))
        await expect(page.locator(".sr-empty")).toBeVisible();
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
