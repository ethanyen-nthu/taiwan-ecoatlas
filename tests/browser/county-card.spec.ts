import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// 63000 is Taipei City, the only county with the tree inventory; 09020 is
// Kinmen County, which has no forest figure in the 2023 classification.
test("a county page links to its card, and a link to it shows a picture of four figures", async ({
  page,
  request,
}) => {
  await page.goto("/county/63000");
  const meta = (property: string) =>
    page.locator(`meta[property="${property}"]`).getAttribute("content");
  expect(await meta("og:title")).toContain("Taipei City");
  expect(await meta("og:description")).toContain("PM2.5");
  const image = (await meta("og:image"))!;
  expect(image).toContain("/county/63000/opengraph-image");
  const picture = await request.get(
    new URL(image).pathname + new URL(image).search,
  );
  expect(picture.status()).toBe(200);
  expect(picture.headers()["content-type"]).toBe("image/png");
  expect((await picture.body()).length).toBeGreaterThan(20000);

  await page
    .getByRole("link", { name: "One-page report card to print or share" })
    .click();
  await expect(page).toHaveURL(/\/county\/63000\/card$/);
});

test("the card has six findings, each with its limit and source, and a dash where there is no figure", async ({
  page,
}) => {
  await page.goto("/county/09020/card");
  await expect(
    page.getByRole("heading", { level: 1, name: "Kinmen County" }),
  ).toBeVisible();
  const rows = page.locator(".county-sheet-rows > li");
  await expect(rows).toHaveCount(6);
  for (const row of await rows.all()) {
    await expect(row).toContainText("Cannot tell you");
    await expect(row).toContainText("Source");
  }
  // Rows are found by their heading: "trees" also appears in the forest row's
  // own words.
  const row = (name: string) =>
    rows.filter({
      has: page.getByRole("heading", { level: 2, name, exact: true }),
    });
  const forest = row("Forests");
  await expect(forest).toHaveAttribute("data-gap", "true");
  await expect(forest).toContainText("Not covered by the 2023 classification");
  await expect(forest.locator(".county-sheet-value")).toHaveCount(0);
  await expect(row("Trees")).toHaveAttribute("data-gap", "true");
  await expect(row("Air")).toHaveAttribute("data-gap", "false");
  await expect(row("Air").locator(".county-sheet-value")).toBeVisible();

  await page.goto("/county/63000/card");
  await expect(row("Trees")).toHaveAttribute("data-gap", "false");
  await expect(row("Trees").locator(".county-sheet-value")).toBeVisible();
});

test("the card follows the language switch and prints without the site chrome", async ({
  page,
}) => {
  await page.goto("/county/63000/card");
  await page.getByRole("button", { name: "繁中" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "臺北市" }),
  ).toBeVisible();
  await expect(page.locator(".county-sheet-rows > li").first()).toContainText(
    "無法說明",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".county-sheet-actions")).toBeHidden();
  await expect(page.locator(".county-sheet")).toBeVisible();
});

test("copy link gives the county page address, which is what LINE previews", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/county/10009/card");
  await page.getByRole("button", { name: "Copy link to share" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "https://taiwan-ecoatlas.vercel.app/county/10009",
  );
});

test("pages with no card of their own share the atlas picture", async ({
  page,
  request,
}) => {
  await page.goto("/about");
  const image = (await page
    .locator('meta[property="og:image"]')
    .getAttribute("content"))!;
  expect(new URL(image).pathname).toBe("/opengraph-image");
  const picture = await request.get(
    new URL(image).pathname + new URL(image).search,
  );
  expect(picture.status()).toBe(200);
  expect(picture.headers()["content-type"]).toBe("image/png");
});

test("a county that does not exist has no card and no picture", async ({
  page,
  request,
}) => {
  const card = await page.goto("/county/00000/card");
  expect(card?.status()).toBe(404);
  const picture = await request.get("/county/00000/opengraph-image");
  expect(picture.status()).toBe(404);
});

test("the card passes automated WCAG checks and does not overflow, at desktop and phone widths", async ({
  page,
}) => {
  for (const size of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(size);
    for (const code of ["63000", "09020"]) {
      await page.goto(`/county/${code}/card`);
      await expect(page.locator(".county-sheet")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
        `${code} at ${size.width}px`,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${code} overflows at ${size.width}px`,
      ).toBe(true);
    }
  }
});
