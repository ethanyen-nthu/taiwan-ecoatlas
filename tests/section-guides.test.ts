import { describe, expect, it } from "vitest";
import { cityPortals, sectionGuides } from "../src/content/section-guides";

describe("section guides", () => {
  it("has a bilingual guide for every subject page", () => {
    expect(Object.keys(sectionGuides).sort()).toEqual([
      "culture",
      "environment",
      "forests",
      "urban",
      "wildlife",
    ]);
    for (const [section, guide] of Object.entries(sectionGuides)) {
      for (const language of ["en", "zh"] as const) {
        const shortest = language === "en" ? 60 : 20;
        expect(guide.what[language].length, section).toBeGreaterThan(shortest);
        expect(guide.limits[language].length, section).toBeGreaterThan(
          shortest,
        );
        expect(guide.learn[language].length, section).toBeGreaterThanOrEqual(3);
      }
      expect(guide.learn.en.length, section).toBe(guide.learn.zh.length);
    }
  });

  it("names the Taipei limit on the city page and does not overstate other sections", () => {
    expect(sectionGuides.urban.limits.en).toMatch(/Taipei only/);
    expect(sectionGuides.forests.limits.en).toMatch(/no 2013 comparison/i);
    expect(sectionGuides.wildlife.limits.en).toMatch(/10 km/);
  });

  it("lists city open-data portals on https only", () => {
    expect(cityPortals.length).toBeGreaterThanOrEqual(5);
    for (const portal of cityPortals)
      expect(portal.url).toMatch(/^https:\/\/[a-z.]+\.gov\.tw$/);
  });
});
