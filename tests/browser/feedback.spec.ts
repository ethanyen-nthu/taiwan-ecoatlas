import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const owner = "ethanyen@gapp.nthu.edu.tw";

test("the page builds an email to the project owner and shows it first", async ({
  page,
}) => {
  await page.goto("/feedback?from=/environment/weather");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tell me what to fix or add",
  );
  await expect(page.getByLabel("Which page? (optional)")).toHaveValue(
    "/environment/weather",
  );

  // Nothing to send yet: the button is off and has no address to open.
  const send = page.getByRole("link", { name: "Open in my email app" });
  await expect(send).toHaveAttribute("aria-disabled", "true");
  await expect(send).not.toHaveAttribute("href", /.+/);
  await expect(
    page.getByRole("button", { name: "Copy the message" }),
  ).toHaveCount(0);

  await page.getByLabel("Something is broken").check();
  await page
    .getByLabel("Your message")
    .fill("The weather table is empty on my phone.\nSecond line & more?");
  await expect(send).toHaveAttribute("aria-disabled", "false");
  const href = (await send.getAttribute("href"))!;
  expect(href.startsWith(`mailto:${owner}?subject=`)).toBe(true);
  const query = new URLSearchParams(href.split("?")[1]);
  expect(query.get("subject")).toBe(
    "[EcoAtlas bug] The weather table is empty on my phone. Second line & more?",
  );
  const body = query.get("body")!;
  expect(body).toContain(
    "The weather table is empty on my phone.\r\nSecond line & more?",
  );
  expect(body).toContain("Type: Bug");
  expect(body).toContain(
    "Page: https://taiwan-ecoatlas.vercel.app/environment/weather",
  );
  expect(body).toContain("Site language: English");
  expect(body).toMatch(/Screen: \d+ × \d+/);
  expect(body).toContain("Browser: ");

  // The preview is the same email, in plain text, before anything opens.
  const preview = page.getByTestId("fb-preview");
  await expect(preview).toContainText(`To: ${owner}`);
  await expect(preview).toContainText("Type: Bug");
  await expect(preview).toContainText("Browser: ");

  // Leaving out the technical details removes exactly those lines.
  await page
    .getByLabel(
      "Add my screen size and browser, which helps me reproduce a bug",
    )
    .uncheck();
  const bare = new URLSearchParams(
    (await send.getAttribute("href"))!.split("?")[1],
  ).get("body")!;
  expect(bare).not.toContain("Browser:");
  expect(bare).not.toContain("Screen:");
  expect(bare).toContain("Type: Bug");

  await page.getByRole("button", { name: "Copy the message" }).click();
  await expect(
    page.getByRole("button", { name: "Message copied" }),
  ).toBeVisible();
});

test("other ways to reach the owner: the address and the public issue page", async ({
  page,
}) => {
  await page.goto("/feedback");
  const side = page.getByRole("complementary");
  await expect(side.getByRole("link", { name: owner })).toHaveAttribute(
    "href",
    `mailto:${owner}`,
  );
  const issue = side.getByRole("link", { name: /Open a GitHub issue/ });
  await expect(issue).toHaveAttribute(
    "href",
    "https://github.com/ethanyen-nthu/taiwan-ecoatlas/issues/new",
  );
  await expect(issue).toHaveAttribute("target", "_blank");
  await expect(issue).toHaveAttribute("rel", /noopener/);
});

test("an address that is not a path on this site is ignored", async ({
  page,
}) => {
  for (const bad of [
    "https://evil.example/x",
    "//evil.example",
    "javascript:alert(1)",
  ]) {
    await page.goto(`/feedback?from=${encodeURIComponent(bad)}`);
    await expect(page.getByLabel("Which page? (optional)")).toHaveValue("");
  }
});

test("every page's footer links here and says which page it came from", async ({
  page,
}) => {
  await page.goto("/environment/weather");
  const link = page
    .locator("footer")
    .getByRole("link", { name: "Suggest or report a bug" });
  await expect(link).toHaveAttribute(
    "href",
    "/feedback?from=/environment/weather",
  );
  await link.click();
  await expect(page).toHaveURL(/\/feedback\?from=\/environment\/weather/);
  await expect(page.getByLabel("Which page? (optional)")).toHaveValue(
    "/environment/weather",
  );
});

test("the page reads in Chinese and the email says so", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "告訴我該修正或新增什麼",
  );
  await page.getByLabel("你的訊息").fill("水庫頁很實用，希望加上歷年資料。");
  const send = page.getByRole("link", { name: "用我的郵件程式開啟" });
  const query = new URLSearchParams(
    (await send.getAttribute("href"))!.split("?")[1],
  );
  expect(query.get("subject")).toBe(
    "[EcoAtlas suggestion] 水庫頁很實用，希望加上歷年資料。",
  );
  expect(query.get("body")).toContain("Site language: 中文");
  await expect(page.locator("main")).not.toContainText(/undefined|NaN/);
});

test("passes automated WCAG checks and fits at 1440, 390 and 320 px", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/feedback?from=/explore");
    await page.getByLabel("Your message").fill("A short note.");
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
      `overflow at ${size.width}px`,
    ).toBeLessThanOrEqual(0);
  }
});
