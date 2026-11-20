import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Watermelon explorer tabs support arrow keys and hidden panels leave the tab order", async ({
  page,
}) => {
  await page.goto("/explore");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  const layers = page.getByRole("tab", { name: /Layers/ });
  const details = page.getByRole("tab", { name: "Data details" });
  await layers.focus();
  await layers.press("ArrowRight");
  await expect(details).toBeFocused();
  await expect(details).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText(
    "Last successful retrieval",
  );
  await details.press("ArrowLeft");
  await expect(layers).toHaveAttribute("aria-selected", "true");
  await page.getByText("More layers", { exact: true }).click();
  await expect(
    page.getByText("Wildlife observations", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle layers panel" }).click();
  await expect(page.locator(".explorer-panel")).toHaveAttribute("inert", "");
  await expect(page.getByRole("tab", { name: /Layers/ })).toHaveCount(0);
});

test("home scroll story has six chapters that count real numbers and link to each subject; methodology disclosures work with the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".journey-chapter")).toHaveCount(6);
  for (const [tone, title, href] of [
    ["environment", /The air we share/, "/environment"],
    ["forests", /Where the forest is/, "/forests"],
    ["wildlife", /Life along the roads/, "/wildlife"],
    ["plants", /The trees of Taipei/, "/plants"],
    ["culture", /People and place/, "/culture"],
    ["urban", /Greener everyday spaces/, "/urban"],
  ] as const) {
    const chapter = page.locator(`#chapter-${tone}`);
    await expect(chapter.getByRole("heading", { level: 3 })).toHaveText(title);
    await expect(chapter.locator(".journey-go")).toHaveAttribute("href", href);
    await expect(chapter.locator("h4")).toHaveText("What you can learn");
  }
  const wildlife = page.locator("#chapter-wildlife");
  await wildlife.scrollIntoViewIfNeeded();
  await expect(wildlife.locator(".journey-number strong")).toHaveText(
    /^10,841$/,
  );
  const culture = page.locator("#chapter-culture");
  await culture.scrollIntoViewIfNeeded();
  await expect(culture.locator(".journey-number strong")).toHaveText(/^730$/);
  await expect(page.locator(".journey-band")).toHaveAttribute(
    "data-active",
    "culture",
  );
  await page.goto("/about");
  const question = page
    .locator("summary")
    .filter({ hasText: "Are the observations live?" });
  await question.focus();
  await question.press("Space");
  await expect(
    page.getByText(
      /A recent retrieval does not make an old observation current/,
    ),
  ).toBeVisible();
});

test("mobile navigation restores focus on Escape and text reflows at 200 percent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Toggle navigation" });
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
  await page.setViewportSize({ width: 320, height: 844 });
  for (const route of [
    "/",
    "/sources",
    "/about",
    "/explore",
    "/teach",
    "/teach/where-is-the-forest",
    "/county",
    "/county/63000",
  ]) {
    await page.goto(route);
    // Confirm hydration through a real state change before resizing root text.
    await page.getByRole("button", { name: "繁中", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    try {
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - window.innerWidth,
            ),
          { message: `Text reflow at 320px and 200% on ${route}` },
        )
        .toBeLessThanOrEqual(1);
    } catch (error) {
      console.error(
        "Reflow overflow",
        route,
        await page.locator("body *").evaluateAll((elements) =>
          elements
            .flatMap((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && rect.right > innerWidth + 1
                ? [
                    {
                      tag: element.tagName,
                      className: element.className,
                      right: rect.right,
                      width: rect.width,
                      text: element.textContent?.slice(0, 100),
                    },
                  ]
                : [];
            })
            .slice(0, 30),
        ),
      );
      throw error;
    }
  }
  await page.screenshot({
    path: "test-results/ui-320-text-200.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("core redesigned pages pass automated WCAG accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of [
    "/",
    "/explore",
    "/sources",
    "/about",
    "/plants",
    `/plants/${encodeURIComponent("榕樹")}`,
    "/urban",
    "/forests",
  ]) {
    await page.goto(route);
    if (route === "/" || route === "/explore")
      await expect(page.locator("[data-map-ready=true]")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      route,
    ).toEqual([]);
  }
});
