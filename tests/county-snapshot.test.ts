import { describe, expect, it } from "vitest";
import { snapshotCounties, taipeiCode } from "@/lib/county-snapshot";
import { countyDetail } from "@/lib/county-rows";
import { atlasFacts } from "@/server/facts";

const plants = { trees: 95857, kinds: 496 };

describe("the landing page's county snapshot", () => {
  it("has one entry for each of the 22 counties and cities", async () => {
    const counties = snapshotCounties(await atlasFacts(), plants);
    expect(counties).toHaveLength(22);
    expect(new Set(counties.map((c) => c.code)).size).toBe(22);
    for (const county of counties) {
      expect(county.en).toBeTruthy();
      expect(county.zh).toBeTruthy();
    }
  });

  it("agrees with the county profile pages for every figure", async () => {
    const facts = await atlasFacts();
    for (const county of snapshotCounties(facts, plants)) {
      const detail = countyDetail(facts, county.code)!;
      expect(county.wildlife.count, county.code).toBe(detail.wildlife);
      expect(county.wildlife.rank, county.code).toBe(detail.wildlifeRank);
      expect(county.villages.count, county.code).toBe(detail.villages);
      expect(county.villages.rank, county.code).toBe(detail.villagesRank);
      expect(county.forest?.sharePct ?? null, county.code).toBe(
        detail.forestShare,
      );
    }
  });

  it("shows urban and tree figures for Taipei only, and nothing else", async () => {
    const counties = snapshotCounties(await atlasFacts(), plants);
    const taipei = counties.find((c) => c.code === taipeiCode)!;
    expect(taipei.zh).toBe("臺北市");
    expect(taipei.urban).not.toBeNull();
    expect(taipei.urban!.parks).toBeGreaterThan(700);
    expect(taipei.plants).toEqual(plants);
    for (const county of counties.filter((c) => c.code !== taipeiCode)) {
      expect(county.urban, county.code).toBeNull();
      expect(county.plants, county.code).toBeNull();
    }
  });

  it("leaves a dataset empty (null or zero count, never a rank) where a county has none", async () => {
    const counties = snapshotCounties(await atlasFacts(), plants);
    for (const county of counties) {
      if (county.wildlife.count === 0) expect(county.wildlife.rank).toBe(0);
      if (county.villages.count === 0) expect(county.villages.rank).toBe(0);
      if (county.forest) {
        expect(county.forest.rank).toBeGreaterThanOrEqual(1);
        expect(county.forest.rank).toBeLessThanOrEqual(county.forest.of);
      }
    }
    // At least one county has no forest statistic in the 2023 release.
    expect(counties.some((c) => c.forest === null)).toBe(true);
  });

  it("uses county names that match the weather and air stations' spelling", async () => {
    const zh = (await atlasFacts()).counties.map((c) => c.zh);
    // From the live feeds on 26 Nov 2026: every county name there is in the atlas.
    for (const name of [
      "基隆市",
      "臺北市",
      "新北市",
      "連江縣",
      "金門縣",
      "澎湖縣",
    ])
      expect(zh).toContain(name);
  });
});
