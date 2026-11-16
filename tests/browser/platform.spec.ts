import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { AtlasCollection, AtlasResult } from "../../src/lib/atlas-types";

const archive = JSON.parse(
  readFileSync("public/data/atlas/wildlife.geojson", "utf8"),
) as AtlasCollection;
const sections = [
  { route: "/environment", dataset: "live-aqi" },
  { route: "/forests", dataset: "landcover-2023" },
  { route: "/wildlife", dataset: "wildlife" },
  { route: "/culture", dataset: "villages" },
  { route: "/urban", dataset: "taipei-parks" },
];

async function openSection(page: Page, route: string, dataset: string) {
  await page.goto(route);
  const workbench = page.locator(".atlas-workbench");
  await expect(workbench).toHaveAttribute("data-dataset", dataset);
  await expect(workbench.getByLabel("Dataset", { exact: true })).toBeEnabled();
  await expect(
    page.locator(".atlas-map .map-canvas-shell[data-map-ready=true]"),
  ).toBeVisible();
  await expect(
    workbench.locator(".atlas-stat-strip strong").first(),
  ).not.toHaveText("—");
  return workbench;
}

async function changedResult(
  page: Page,
  dataset: string,
  query: Record<string, string>,
  change: () => Promise<unknown>,
) {
  const response = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/api/atlas/${dataset}` &&
      Object.entries(query).every(
        ([key, value]) => url.searchParams.get(key) === value,
      )
    );
  });
  await change();
  const resolved = await response;
  expect(resolved.ok()).toBe(true);
  return (await resolved.json()) as AtlasResult;
}

test.describe("integrated atlas platform", () => {
  test("new section dashboards and a populated chart pass automated WCAG checks", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const check = async (label: string) => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
        label,
      ).toEqual([]);
    };
    for (const section of sections) {
      await openSection(page, section.route, section.dataset);
      await check(`${section.route} dashboard`);
    }
    const wildlife = await openSection(page, "/wildlife", "wildlife");
    await wildlife
      .getByRole("tab", { name: "Compare & charts", exact: true })
      .click();
    await expect(wildlife.locator(".atlas-charts")).toBeVisible();
    await expect(wildlife.locator(".atlas-chart-panel").first()).toContainText(
      /Regional comparison/,
    );
    await expect(wildlife.locator(".recharts-surface").first()).toBeVisible();
    await check("wildlife charts");
    await page.screenshot({
      path: testInfo.outputPath("wildlife-charts-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
  });

  test("all subject dashboards reflow and preserve their controls at tablet width", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const section of sections) {
      const workbench = await openSection(page, section.route, section.dataset);
      await expect(
        workbench.getByLabel("County", { exact: true }),
      ).toBeVisible();
      await expect(
        workbench.getByLabel("Search records", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - window.innerWidth,
            ),
          { message: `${section.route} tablet horizontal overflow` },
        )
        .toBeLessThanOrEqual(1);
      const mapTab = workbench.getByRole("tab", {
        name: "Map & records",
        exact: true,
      });
      const chartsTab = workbench.getByRole("tab", {
        name: "Compare & charts",
        exact: true,
      });
      await mapTab.focus();
      await mapTab.press("ArrowRight");
      await expect(chartsTab).toBeFocused();
      await expect(chartsTab).toHaveAttribute("aria-selected", "true");
      await chartsTab.press("ArrowLeft");
      await expect(mapTab).toHaveAttribute("aria-selected", "true");
      await page.screenshot({
        path: testInfo.outputPath(`${section.dataset}-tablet.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  });

  for (const section of sections) {
    test(`${section.route} renders its actual dataset, map and Watermelon panels`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const workbench = await openSection(page, section.route, section.dataset);
      await expect(
        workbench.getByLabel("County", { exact: true }).locator("option"),
      ).toHaveCount(23);
      await workbench
        .getByRole("tab", { name: "Sources & scope", exact: true })
        .click();
      await expect(workbench.getByRole("tabpanel")).toContainText(
        /CC BY|License/i,
      );
      await expect(
        workbench.getByRole("link", {
          name: /Official source \/ research archive/,
        }),
      ).toHaveAttribute("href", /^https:\/\//);
      await workbench
        .getByRole("tab", { name: "Compare & charts", exact: true })
        .click();
      await expect(workbench.getByRole("tabpanel")).toContainText(
        /coverage|missing|comparison/i,
      );
      await workbench
        .getByRole("tab", { name: "Map & records", exact: true })
        .click();
      if (section.route === "/forests") {
        await expect(
          workbench.getByLabel("Land-cover legend", { exact: true }),
        ).toBeVisible();
        await expect(
          workbench.getByText("Raster overview · nearest-neighbour display", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          workbench.getByLabel("Map display", { exact: true }),
        ).toHaveCount(0);
      } else {
        await expect(
          workbench.getByLabel("Map display", { exact: true }),
        ).toBeVisible();
        await workbench
          .getByLabel("Map display", { exact: true })
          .selectOption("heatmap");
        await expect(
          workbench.getByLabel("Map display", { exact: true }),
        ).toHaveValue("heatmap");
        await workbench
          .getByLabel("Map display", { exact: true })
          .selectOption("clusters");
      }
      await page.screenshot({
        path: testInfo.outputPath(`${section.dataset}-desktop.png`),
        fullPage: true,
        animations: "disabled",
      });
      expect(errors).toEqual([]);
    });
  }

  test("wildlife species, county and date selections filter real observations and expose a species profile", async ({
    page,
  }) => {
    const workbench = await openSection(page, "/wildlife", "wildlife");
    const seed = archive.features.find(
      (f) =>
        f.properties.countyCode && f.properties.speciesId && f.properties.date,
    )!;
    const county = String(seed.properties.countyCode),
      species = String(seed.properties.speciesId),
      date = String(seed.properties.date);
    const selected = await changedResult(page, "wildlife", { species }, () =>
      workbench.getByLabel("Species", { exact: true }).selectOption(species),
    );
    expect(selected.total).toBe(
      archive.features.filter((f) => f.properties.speciesId === species).length,
    );
    await changedResult(page, "wildlife", { species, county }, () =>
      workbench.getByLabel("County", { exact: true }).selectOption(county),
    );
    await changedResult(
      page,
      "wildlife",
      { species, county, start: date },
      () => workbench.getByLabel("Start date", { exact: true }).fill(date),
    );
    const dated = await changedResult(
      page,
      "wildlife",
      { species, county, start: date, end: date },
      () => workbench.getByLabel("End date", { exact: true }).fill(date),
    );
    expect(dated.total).toBe(
      archive.features.filter(
        (f) =>
          f.properties.speciesId === species &&
          f.properties.countyCode === county &&
          f.properties.date === date,
      ).length,
    );
    expect(dated.total).toBeGreaterThan(0);
    await expect(
      workbench
        .getByRole("button", {
          name: `View ${dated.records[0].properties.title}`,
          exact: true,
        })
        .first(),
    ).toBeVisible();
    const profile = workbench
      .locator(`a[href="/wildlife/species/${species}"]`)
      .first();
    await expect(profile).toBeVisible();
    await profile.click();
    await expect(page).toHaveURL(`/wildlife/species/${species}`);
    await expect(
      page.getByRole("heading", {
        name: String(seed.properties.species),
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Published subset record" }),
    ).toBeVisible();
    await expect(page.getByText(/not a population trend/i)).toBeVisible();
  });

  test("the subject's central-atlas link enables its real wildlife layer", async ({
    page,
  }) => {
    const workbench = await openSection(page, "/wildlife", "wildlife");
    const response = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/atlas/map" &&
        (url.searchParams.get("layers") || "")
          .split(",")
          .includes("wildlife") &&
        response.ok()
      );
    });
    await workbench.getByRole("link", { name: /Open central atlas/ }).click();
    await expect(page).toHaveURL(/\/explore\?layers=wildlife$/);
    await expect(page.locator("[data-map-ready=true]")).toBeVisible();
    const data = (await (await response).json()) as {
      layers: {
        dataset: { id: string };
        collection: AtlasCollection;
        total: number;
      }[];
      errors: string[];
    };
    const wildlife = data.layers.find(
      (layer) => layer.dataset.id === "wildlife",
    );
    expect(wildlife?.total).toBe(archive.features.length);
    expect(wildlife?.collection.features.length).toBeGreaterThan(0);
    expect(data.errors).not.toContain("wildlife");
    await page.getByText("More layers", { exact: true }).click();
    await expect(
      page.getByRole("switch", {
        name: "Roadkill archive · public subset",
        exact: true,
      }),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("cultural place details link to the actual published source profile", async ({
    page,
  }) => {
    const workbench = await openSection(page, "/culture", "villages");
    await expect(
      workbench.getByRole("button", { name: /^View / }).first(),
    ).toBeVisible();
    await workbench
      .getByRole("button", { name: /^View / })
      .first()
      .click();
    const profile = workbench.locator('a[href^="/culture/"]').first();
    await expect(profile).toBeVisible();
    const href = await profile.getAttribute("href");
    await profile.click();
    await expect(page).toHaveURL(href!);
    await expect(
      page.getByRole("heading", { name: "Published place record" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Original dataset / official page" }),
    ).toHaveAttribute("href", /^https:\/\//);
  });

  test("the unavailable 2013 edition stays empty and explains the missing baseline", async ({
    page,
  }) => {
    const workbench = await openSection(page, "/forests", "landcover-2023");
    const data = await changedResult(page, "landcover-2013", {}, () =>
      workbench
        .getByLabel("Dataset", { exact: true })
        .selectOption("landcover-2013"),
    );
    expect(data.total).toBe(0);
    expect(data.dataset.status).toBe("unavailable");
    await expect(workbench).toHaveAttribute("data-dataset", "landcover-2013");
    await expect(workbench.getByRole("button", { name: /^View / })).toHaveCount(
      0,
    );
    await expect(workbench).toContainText(
      /unavailable|not verified|not been verified|not available/i,
    );
  });

  test("all sections reflow on a narrow mobile viewport and support Traditional Chinese", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const section of sections) {
      const workbench = await openSection(page, section.route, section.dataset);
      await expect(
        workbench.getByLabel("Dataset", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - window.innerWidth,
            ),
          { message: `${section.route} mobile horizontal overflow` },
        )
        .toBeLessThanOrEqual(1);
    }
    await page.getByRole("button", { name: "繁中", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await expect(page.locator(".atlas-workbench")).not.toContainText(
      "Map & records",
    );
    await page.screenshot({
      path: testInfo.outputPath("mobile-zh.png"),
      fullPage: true,
      animations: "disabled",
    });
  });
});
