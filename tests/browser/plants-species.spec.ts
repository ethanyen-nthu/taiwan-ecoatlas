import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const cors = { "access-control-allow-origin": "*" };

/** Stands in for Wikipedia and Commons, which the tests must not call. */
async function mockWikimedia(page: Page, options: { fail?: boolean } = {}) {
  await page.route(/upload\.wikimedia\.org/, (route) =>
    route.fulfill({ contentType: "image/png", headers: cors, body: pixel }),
  );
  await page.route(/\.wikipedia\.org\/w\/api\.php/, (route) => {
    if (options.fail) return route.abort();
    const url = new URL(route.request().url());
    const reply = (query: unknown) =>
      route.fulfill({
        contentType: "application/json",
        headers: cors,
        body: JSON.stringify({ query }),
      });
    if ((url.searchParams.get("prop") || "").includes("imageinfo"))
      return reply({
        pages: {
          "1": {
            title: "File:Specimen.jpg",
            imagerepository: "shared",
            imageinfo: [
              {
                thumburl: "https://upload.wikimedia.org/thumb/Specimen.jpg",
                thumbwidth: 960,
                thumbheight: 640,
                descriptionurl:
                  "https://commons.wikimedia.org/wiki/File:Specimen.jpg",
                extmetadata: {
                  Artist: { value: '<a href="//x">Jane Photographer</a>' },
                  LicenseShortName: { value: "CC BY-SA 4.0" },
                  LicenseUrl: {
                    value: "https://creativecommons.org/licenses/by-sa/4.0",
                  },
                },
              },
            ],
          },
        },
      });
    return reply({
      pages: {
        "1": {
          title: "Specimen",
          fullurl: `https://${url.hostname}/wiki/Specimen`,
          extract: "A test summary written by the mock encyclopedia.",
          pageimage: "Specimen.jpg",
          images: [{ title: "File:Specimen.jpg" }],
        },
      },
    });
  });
}

test("plants page filters 496 kinds and opens a tree with live photo, credit and numbers", async ({
  page,
}) => {
  await mockWikimedia(page);
  await page.goto("/plants");
  await expect(page.getByRole("status")).toHaveText("496 kinds shown");
  await page.getByRole("searchbox").fill("榕");
  await expect(page.locator(".plants-cards li").first()).toContainText("榕樹");
  await page.getByLabel("Growing type").selectOption("palm");
  await expect(page.getByRole("status")).not.toHaveText("496 kinds shown");
  await page.getByLabel("Growing type").selectOption("all");
  await page.getByRole("searchbox").fill("banyan");
  await page.getByRole("link", { name: /榕樹/ }).first().click();
  await expect(page).toHaveURL(/\/plants\/%E6%A6%95%E6%A8%B9$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Chinese banyan",
  );
  await expect(page.locator(".plants-names")).toContainText("Ficus microcarpa");
  const gallery = page.locator(".wiki-gallery");
  await expect(gallery).toHaveAttribute("data-state", "photos");
  await expect(gallery.locator("figure img")).toBeVisible();
  // The stored photo leads, with its photographer and licence...
  await expect(gallery.locator("figure img")).toHaveAttribute(
    "src",
    /thumb\/2\/24\/Ficus_microcarpa_-_La_Gomera_01\.jpg\/960px-/,
  );
  await expect(gallery.locator("figcaption")).toContainText("H. Zell");
  await expect(gallery.locator("figcaption")).toContainText("CC BY-SA 3.0");
  await expect(gallery.locator("figcaption a").last()).toHaveAttribute(
    "href",
    "https://commons.wikimedia.org/wiki/File:Ficus_microcarpa_-_La_Gomera_01.jpg",
  );
  // ...and the photos found live follow it.
  const thumbs = gallery.locator(".wiki-gallery-thumbs button");
  await expect(thumbs).toHaveCount(2);
  await thumbs.nth(1).click();
  await expect(gallery.locator("figcaption")).toContainText(
    "Jane Photographer",
  );
  await expect(gallery.locator("figcaption")).toContainText("CC BY-SA 4.0");
  await expect(gallery.locator("figcaption a").last()).toHaveAttribute(
    "href",
    "https://commons.wikimedia.org/wiki/File:Specimen.jpg",
  );
  await expect(gallery).toContainText("A test summary written by the mock");
  await expect(gallery).toContainText("Aerial roots");
  await expect(page.locator(".plants-stat-grid")).toContainText("12,336");
  await expect(
    page.getByRole("link", { name: "Find these trees on the park map" }),
  ).toHaveAttribute("href", /\/urban\?dataset=taipei-park-trees&q=/);
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("榕樹");
});

test("tree cards carry a photo, or a quiet tile where Commons has none", async ({
  page,
}) => {
  await page.goto("/plants");
  const banyan = page.locator(".plants-cards li", { hasText: "榕樹" }).first();
  await expect(banyan.locator(".photo-thumb img")).toHaveAttribute(
    "src",
    /thumb\/2\/24\/Ficus_microcarpa_-_La_Gomera_01\.jpg\/500px-/,
  );
  await page.getByRole("searchbox").fill("小葉欖仁");
  const plain = page.locator(".plants-cards li").first();
  await expect(plain).toContainText("小葉欖仁");
  await expect(plain.locator(".photo-thumb")).toHaveAttribute(
    "data-photo",
    "none",
  );
});

test("a tree page still works when Wikimedia is unreachable, and an unknown tree is a 404", async ({
  page,
}) => {
  await mockWikimedia(page, { fail: true });
  // A tree with a stored photo keeps its picture and credit without Wikipedia.
  await page.goto("/plants/" + encodeURIComponent("茄苳"));
  await expect(page.locator(".wiki-gallery")).toHaveAttribute(
    "data-state",
    "photos",
  );
  await expect(page.locator(".wiki-gallery figcaption")).toContainText(
    "Geographer",
  );
  // One with none says so plainly.
  await page.goto("/plants/" + encodeURIComponent("小葉欖仁"));
  await expect(page.locator(".wiki-gallery")).toHaveAttribute(
    "data-state",
    "none",
  );
  await expect(page.locator(".wiki-gallery")).toContainText(
    "Photos could not be loaded right now",
  );
  await expect(page.locator(".plants-stat-grid")).toContainText(
    "Trees recorded",
  );
  const missing = await page.goto(
    "/plants/" + encodeURIComponent("沒有這種樹"),
  );
  expect(missing?.status()).toBe(404);
});

test("an animal page leads with its Chinese and English names, a photo and a credit", async ({
  page,
}) => {
  await mockWikimedia(page);
  const species = (
    JSON.parse(
      readFileSync("public/data/atlas/wildlife.species.json", "utf8"),
    ) as { species: { id: string; name: string }[] }
  ).species.find((item) => item.name === "Duttaphrynus melanostictus")!;
  await page.goto(`/wildlife/species/${species.id}`);
  await expect(page).toHaveTitle(/黑眶蟾蜍/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Asian common toad",
  );
  await expect(page.locator(".wiki-gallery")).toHaveAttribute(
    "data-state",
    "photos",
  );
  await expect(page.locator(".wiki-gallery figcaption")).toContainText(
    "LiCheng Shih",
  );
  await expect(page.locator(".wiki-gallery-thumbs button")).toHaveCount(2);
  await expect(page.locator("main")).toContainText("黑眶蟾蜍");
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("黑眶蟾蜍");
});

test("the wildlife map names animals in both languages and finds them by Chinese name", async ({
  page,
}) => {
  await page.goto("/wildlife?q=%E9%BB%91%E7%9C%B6");
  const workbench = page.locator(".atlas-workbench");
  await expect(workbench).toHaveAttribute("data-subject", "wildlife");
  await expect(workbench.getByLabel("Species", { exact: true })).toContainText(
    "Asian common toad · 黑眶蟾蜍",
  );
  // 黑眶 is part of the Chinese name only; the source data has no such text.
  await expect(
    workbench.locator(".atlas-stat-strip strong").first(),
  ).toHaveText(/^[1-9][\d,]*$/);
});

test("every subject page opens with what it shows and what it cannot tell you; the city page explains why only Taipei", async ({
  page,
}) => {
  for (const section of [
    "environment",
    "forests",
    "wildlife",
    "culture",
    "urban",
  ]) {
    await page.goto(`/${section}`);
    const guide = page.locator(".section-guide");
    await expect(guide).toContainText("What this page shows");
    await expect(guide).toContainText("What you can learn");
    await expect(guide).toContainText("What it cannot tell you");
    await expect(page.locator(".atlas-section-nav a")).toContainText([
      "Environment",
      "Forests",
      "Wildlife",
      "Plants",
      "Culture",
      "City",
      "All layers ↗",
    ]);
  }
  await page.goto("/urban");
  const coverage = page.locator("details.city-coverage");
  await expect(
    page.getByRole("heading", { name: "Why only Taipei?" }),
  ).toBeVisible();
  await expect(coverage.locator("summary")).toContainText(
    "only city whose park and tree lists have been checked",
  );
  await expect(coverage).not.toHaveAttribute("open", "");
  await coverage.locator("summary").click();
  const portals = coverage.locator("li a");
  await expect(portals).toHaveCount(6);
  for (const link of await portals.all()) {
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /^https:\/\/.+\.gov\.tw$/);
  }
  await expect(coverage).toContainText(
    "We have not imported anything from them yet",
  );
  await page.getByRole("button", { name: "繁中", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "為什麼只有臺北？" }),
  ).toBeVisible();
});

test("header navigation includes Plants and highlights it on tree pages", async ({
  page,
}) => {
  await mockWikimedia(page);
  await page.goto("/plants/" + encodeURIComponent("樟樹"));
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", {
        name: "Plants",
      }),
  ).toHaveAttribute("aria-current", "true");
});
