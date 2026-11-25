import { describe, expect, it } from "vitest";
import {
  airSources,
  centralSouthPm25,
  gapYears,
  nationalPm25,
  percentChange,
  redAlerts,
  sourceById,
  yardsticks,
  yearSpan,
} from "@/content/air-history";

describe("long-run air record", () => {
  it("runs forward in time inside the stated span and skips the unreconciled years", () => {
    const years = nationalPm25.map((point) => point.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(new Set(years).size).toBe(years.length);
    expect(years[0]).toBe(yearSpan.first);
    expect(years[years.length - 1]).toBe(yearSpan.last);
    for (const gap of gapYears) expect(years).not.toContain(gap);
    expect(gapYears).toEqual([2020, 2021]);
  });

  it("keeps every value in a believable PM2.5 range", () => {
    for (const point of [...nationalPm25, ...centralSouthPm25]) {
      expect(point.value, String(point.year)).toBeGreaterThan(5);
      expect(point.value, String(point.year)).toBeLessThan(40);
    }
  });

  it("agrees with the ministry's own headline numbers", () => {
    const at = (year: number) =>
      nationalPm25.find((point) => point.year === year)?.value;
    expect(at(2013)).toBe(24.0);
    expect(at(2016)).toBe(20.0);
    expect(at(2019)).toBe(16.2);
    expect(at(2024)).toBe(12.8);
    expect(at(2025)).toBe(12.8);
    // The ministry calls this a 47% improvement.
    expect(percentChange(24.0, 12.8)).toBe(-47);
    // Central and southern Taiwan: 24.4% in the ministry's statement.
    expect(percentChange(19.6, 14.8)).toBe(-24);
    // Red alerts: down 85% on the Executive Yuan's page.
    expect(percentChange(redAlerts[0].count, redAlerts[1].count)).toBe(-85);
  });

  it("places the regional points on years the national series also has", () => {
    const years = new Set(nationalPm25.map((point) => point.year));
    for (const point of centralSouthPm25)
      expect(years.has(point.year)).toBe(true);
    for (const point of centralSouthPm25) {
      const national = nationalPm25.find((item) => item.year === point.year)!;
      expect(point.value).toBeGreaterThan(national.value);
    }
  });

  it("cites a real, unique source for every number", () => {
    const urls = airSources.map((source) => source.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(new Set(airSources.map((source) => source.id)).size).toBe(
      airSources.length,
    );
    for (const source of airSources) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.title.en.length).toBeGreaterThan(5);
      expect(source.title.zh.length).toBeGreaterThan(2);
      expect(source.used.en.length).toBeGreaterThan(5);
      expect(source.used.zh.length).toBeGreaterThan(2);
    }
    const claims = [
      ...nationalPm25,
      ...centralSouthPm25,
      ...redAlerts,
      ...yardsticks,
    ];
    for (const claim of claims) {
      expect(claim.sources.length).toBeGreaterThanOrEqual(1);
      for (const id of claim.sources) expect(sourceById(id), id).toBeDefined();
    }
  });

  it("draws the standard lines the ministry and WHO publish", () => {
    expect(yardsticks.map((line) => line.value)).toEqual([15, 12, 5]);
  });
});
