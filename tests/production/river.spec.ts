import { expect, test } from "@playwright/test";
import type { AtlasResult } from "../../src/lib/atlas-types";
import type { Counties } from "../../src/lib/types";

// Public, read-only release verification. No fixtures, route interception,
// provider-credential inputs or skipping unavailable providers.
test("river: actual historical MOENV samples reach record details with separate timestamps", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(150000);
  const [response, boundaryResponse] = await Promise.all([
    request.get("/api/atlas/river-quality?limit=100", { timeout: 65000 }),
    request.get("/data/counties.geojson"),
  ]);
  expect(response.status(), "The public river API must be reachable").toBe(200);
  expect(boundaryResponse.status()).toBe(200);
  const data = (await response.json()) as AtlasResult;
  const countyCodes = new Set(
    ((await boundaryResponse.json()) as Counties).features.map(
      (county) => county.properties.COUNTYCODE,
    ),
  );
  expect(countyCodes.size).toBe(22);
  expect(
    data.status,
    "The river provider must supply actual historical samples with working server credentials",
  ).toBe("historical-only");
  expect(data.dataset.sourceId).toBe("WQX_P_01");
  expect(data.total).toBeGreaterThan(0);
  expect(data.records.length).toBeGreaterThan(0);
  expect(new Set(data.records.map((record) => record.properties.id)).size).toBe(
    data.records.length,
  );
  expect(Number.isFinite(Date.parse(data.retrievedAt || ""))).toBe(true);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let numericIndicators = 0;
  let assignedCounties = 0;
  for (const record of data.records) {
    const p = record.properties;
    expect(p.sourceId).toBe("WQX_P_01");
    expect(typeof p.stationId).toBe("string");
    expect(String(p.stationId).length).toBeGreaterThan(0);
    expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${p.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(
      p.date,
    );
    expect(
      p.date! <= today,
      "A sampling date must not be fabricated in the future",
    ).toBe(true);
    expect(p.id).toBe(`${p.stationId}:${p.date}`);
    expect(
      p.publishedAt,
      "Publication dates are absent from this source schema and must remain missing",
    ).toBeNull();
    expect(p.date).not.toBe(p.publishedAt);
    if (p.countyCode !== null) {
      expect(countyCodes.has(p.countyCode)).toBe(true);
      assignedCounties++;
    }
    expect(record.geometry.type).toBe("Point");
    if (record.geometry.type !== "Point")
      throw new Error("Expected original river station point");
    const [longitude, latitude] = record.geometry.coordinates;
    expect(longitude).toBeGreaterThanOrEqual(117);
    expect(longitude).toBeLessThanOrEqual(125);
    expect(latitude).toBeGreaterThanOrEqual(20);
    expect(latitude).toBeLessThanOrEqual(27);
    for (const indicator of ["do", "bod", "ss", "nh3n", "rpi"]) {
      const value = p[indicator];
      expect(value === null || typeof value === "number").toBe(true);
      if (typeof value === "number") {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(indicator === "rpi" ? 1 : 0);
        if (indicator === "rpi") expect(value).toBeLessThanOrEqual(10);
        numericIndicators++;
      }
    }
  }
  expect(
    numericIndicators,
    "At least one genuine numeric river indicator must be present",
  ).toBeGreaterThan(0);
  expect(
    assignedCounties,
    "Actual samples must join the official county registry",
  ).toBeGreaterThan(0);

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const pageResponse = await page.goto("/environment");
  expect(pageResponse?.status()).toBe(200);
  const workbench = page.locator(".atlas-workbench");
  const dataset = workbench.getByRole("combobox", {
    name: "Dataset",
    exact: true,
  });
  await expect(dataset).toBeEnabled();
  await dataset.selectOption("river-quality");
  await expect(workbench).toHaveAttribute("data-dataset", "river-quality");
  const firstRecord = workbench.getByRole("button", { name: /^View / }).first();
  await expect(firstRecord).toBeVisible();
  await firstRecord.click();
  const details = page.locator("#atlas-record-details");
  await expect(details).toBeVisible();
  await expect(details).toContainText("WQX_P_01");
  const sampling = details
    .locator("dl > div")
    .filter({ has: page.getByText("Sampling date", { exact: true }) });
  const publication = details
    .locator("dl > div")
    .filter({ has: page.getByText("Publication time", { exact: true }) });
  await expect(sampling.locator("dd")).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
  await expect(publication.locator("dd")).toHaveText(
    "Not supplied by this source record",
  );
  expect((await sampling.locator("dd").innerText()) <= today).toBe(true);
  for (const label of [
    "Dissolved oxygen",
    "BOD",
    "Suspended solids",
    "Ammonia nitrogen",
    "Reported RPI",
  ])
    await expect(details.getByText(label, { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("public-river-sample-details.png"),
    fullPage: true,
  });
  console.log(
    `river: ${data.total} grouped samples; checked=${data.records.length}; numericIndicators=${numericIndicators}; retrieved=${data.retrievedAt}`,
  );
});
