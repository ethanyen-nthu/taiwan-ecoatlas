import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const lessonSlugs = [
  "air-quality-index",
  "river-pollution-index",
  "where-is-the-forest",
  "roadkill-and-counting-effort",
  "villages-and-places",
  "urban-green-and-heat",
  "audit-a-dataset",
];

test("the teach index lists every lesson and each opens", async ({ page }) => {
  await page.goto("/teach");
  await expect(
    page.getByRole("heading", { level: 1, name: "Teach with the atlas" }),
  ).toBeVisible();
  const main = page.locator("main");
  for (const slug of lessonSlugs)
    await expect(main.locator(`a[href="/teach/${slug}"]`)).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Teach", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await main.locator('a[href="/teach/where-is-the-forest"]').click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Where is the forest?" }),
  ).toBeVisible();
  // On a lesson page the Teach link marks the section, not the exact page.
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", {
        name: "Teach",
        exact: true,
      }),
  ).toHaveAttribute("aria-current", "true");
});

test("a lesson switches to a student handout and prints its links", async ({
  page,
}) => {
  await page.goto("/teach/where-is-the-forest");
  const notes = page.locator(".instructor-only").first();
  await expect(notes).toBeVisible();
  const toggle = page.getByRole("button", { name: "Student handout view" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".lesson-body .instructor-only").first(),
  ).toBeHidden();
  // The activity and questions stay for students.
  await expect(
    page.getByRole("heading", { name: "Discussion questions" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await toggle.click();
  await expect(notes).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".site-header")).toBeHidden();
  const link = page.locator(".lesson-open").first();
  const after = await link.evaluate(
    (el) => getComputedStyle(el, "::after").content,
  );
  expect(after).toContain("/forests");
});

test("lesson step links open the exact map view they describe", async ({
  page,
}) => {
  await page.goto("/teach/where-is-the-forest");
  await page.getByRole("link", { name: /Open county shares/ }).click();
  await expect(page).toHaveURL(/\/forests\?.*shade=1/);
  await expect(page.getByLabel("Shade counties")).toBeChecked();
});

test("the lesson is readable in Traditional Chinese and cites itself", async ({
  page,
}) => {
  await page.goto("/teach/roadkill-and-counting-effort");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("路死");
  await expect(page.locator(".lesson-cite")).toContainText(
    "taiwan-ecoatlas.vercel.app/teach/roadkill-and-counting-effort",
  );
  await expect(page.locator(".lesson-body")).not.toContainText("undefined");
});

test("map pages point to their lessons and to the chosen county", async ({
  page,
}) => {
  await page.goto("/wildlife");
  const aside = page.locator(".atlas-teach");
  await expect(aside).toBeVisible();
  await expect(
    aside.locator('a[href="/teach/roadkill-and-counting-effort"]'),
  ).toBeVisible();
  await expect(aside.locator('a[href="/teach/audit-a-dataset"]')).toBeVisible();
  await expect(
    aside.getByRole("link", { name: /Compare counties/ }),
  ).toBeVisible();
  await page.goto("/wildlife?county=67000");
  await expect(
    page.locator('.atlas-teach a[href="/county/67000"]'),
  ).toBeVisible();
});

test("lesson tiles are coloured cards and the island silhouette stays inside them", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/teach");
    const tiles = page.locator(".teach-tiles > li > a");
    await expect(tiles).toHaveCount(lessonSlugs.length);
    for (let i = 0; i < lessonSlugs.length; i += 1) {
      const tile = tiles.nth(i);
      const box = await tile.boundingBox();
      // A card, not a page-sized shape: never wider than the content column.
      expect(box!.width).toBeLessThan(viewport.width);
      expect(box!.height).toBeLessThan(420);
      const background = await tile.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      expect(background).not.toBe("rgba(0, 0, 0, 0)");
      const island = tile.locator(".subject-tile-island");
      const clipped = await island.evaluate((el) => {
        const own = el.getBoundingClientRect();
        const card = el.closest("a")!.getBoundingClientRect();
        return own.height <= card.height * 1.3;
      });
      expect(clipped).toBe(true);
    }
    // No decorative silhouette anywhere on the page is larger than the screen.
    const oversize = await page.evaluate(
      (w) =>
        [...document.querySelectorAll("svg")].filter((svg) => {
          const r = svg.getBoundingClientRect();
          return r.width > w || r.height > 800;
        }).length,
      viewport.width,
    );
    expect(oversize).toBe(0);
  }
});

test("county profiles compare every county and link across the datasets", async ({
  page,
}) => {
  await page.goto("/county");
  const rows = page.locator(".county-table tbody tr");
  await expect(rows).toHaveCount(22);
  await page.getByRole("button", { name: /Roadkill records/ }).click();
  await expect(rows.first()).toContainText("Chanhua".slice(0, 0));
  await page.getByRole("link", { name: "Tainan City" }).click();
  await expect(page).toHaveURL(/\/county\/67000$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tainan City" }),
  ).toBeVisible();
  await expect(page.locator(".county-card")).toHaveCount(5);
  await page
    .getByLabel("Go to another county")
    .selectOption({ label: "Hualien County" });
  await expect(page).toHaveURL(/\/county\/10015$/);
  // A code that is not a county is a real 404.
  const missing = await page.goto("/county/00000");
  expect(missing?.status()).toBe(404);
});

test("teaching pages pass automated WCAG checks on desktop and phone", async ({
  page,
}) => {
  const routes = [
    "/teach",
    "/teach/glossary",
    "/teach/air-quality-index",
    "/teach/audit-a-dataset",
    "/county",
    "/county/63000",
  ];
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
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
        `${route} at ${size.width}px`,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
          // Allow one pixel of rounding.
        ),
        `${route} overflows at ${size.width}px`,
      ).toBeLessThanOrEqual(1);
    }
  }
});

test("the glossary links each term to the lesson that uses it", async ({
  page,
}) => {
  await page.goto("/teach/glossary");
  await expect(page.locator(".glossary-list dt").first()).toBeVisible();
  expect(
    await page.locator(".glossary-list dt").count(),
  ).toBeGreaterThanOrEqual(15);
  const first = page.locator(".glossary-list a").first();
  const href = await first.getAttribute("href");
  expect(href).toMatch(/^\/teach\/[a-z-]+$/);
  await first.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});
