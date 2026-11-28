import { expect, test } from "@playwright/test";

// A lazily loaded part (the map) whose file cannot be fetched is replaced by a
// note, and the rest of the page, here the Today readings, keeps working. With
// no connection this is what a page opened for the first time looks like when
// its map code was never saved on the device. Figures are synthetic.
const at = "2026-11-26T07:00:00.000Z";
const today = {
  checkedAt: at,
  air: {
    status: "fresh",
    stations: 84,
    reporting: 62,
    medianAqi: 54,
    band: "普通",
    bandEnglish: "Moderate",
    latest: at,
  },
  weather: {
    status: "fresh",
    stations: 874,
    medianTemperature: 21.9,
    warmest: { value: 26.6, station: "Alpha", county: "屏東縣" },
    coolest: { value: 3.2, station: "Bravo", county: "南投縣" },
    rainReporting: 861,
    raining: 312,
    latest: at,
  },
  reservoirs: {
    status: "fresh",
    large: 17,
    percent: 88.8,
    lowest: null,
    latest: at,
  },
};

test("a map file that cannot be fetched is replaced by a note and the readings stay", async ({
  page,
}) => {
  await page.route("**/api/today", (route) => route.fulfill({ json: today }));
  // Refuse every script file that holds the map library, whatever it is named.
  await page.route("**/_next/static/chunks/**/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (/maplibre/i.test(body)) return route.abort("failed");
    return route.fulfill({ response, body });
  });
  await page.goto("/");
  const note = page.locator("[data-missing-piece]").first();
  await expect(note).toBeVisible();
  await expect(note).toContainText("Part of this page could not be loaded");
  await expect(
    page.getByRole("button", { name: "Reload the page" }).first(),
  ).toBeVisible();
  const hero = page.locator('[data-today="hero"]');
  await expect(hero).toContainText("Moderate");
  // Not the page-wide error screen.
  await expect(page.getByText("This view could not be loaded")).toHaveCount(0);
  await expect(page.locator("h1").first()).toContainText("open data");
});
