import { describe, expect, it } from "vitest";
import {
  aqiColor,
  measurement,
  parseAqi,
  parseWeather,
  taiwanTime,
} from "@/lib/transform";
import { observationFreshness } from "@/lib/freshness";
import aqi from "./fixtures/aqi.json";
import weather from "./fixtures/weather.json";
describe("AQI official-format transformation", () => {
  it("excludes reversed coordinates, deduplicates by original ID and retains newest record", () => {
    const result = parseAqi(aqi);
    expect(result.excluded).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      id: "TEST-A",
      station: "Fixture station",
      observedAt: "2026-11-15T00:00:00.000Z",
      publishedAt: "2026-11-15T00:00:00.000Z",
      values: { pm25: 7.1, pm10: null, o3: null, so2: 0 },
    });
  });
  it("uses reported status rather than inferring a class from AQI", () => {
    expect(aqiColor("良好")).toBe("#009865");
    expect(aqiColor("unknown")).toBe("#7c868d");
    expect(aqiColor(null)).toBe("#7c868d");
  });
  it("rejects empty or changed schemas", () => {
    expect(() => parseAqi({ records: [] })).toThrow();
    expect(() => parseAqi({ data: [] })).toThrow();
  });
});
describe("CWA official-format transformation", () => {
  it("chooses WGS84 explicitly and preserves legitimate sub-zero temperatures", () => {
    const result = parseWeather(weather).observations[0];
    expect(result.longitude).toBe(121.514);
    expect(result.latitude).toBe(25.046);
    expect(result.values).toEqual({
      temperature: -2.1,
      rainfall: null,
      humidity: 86,
      windSpeed: null,
      windDirection: null,
    });
    expect(result.publishedAt).toBeNull();
  });
  it("does not relabel TWD67 coordinates as WGS84", () => {
    const fixture = structuredClone(weather);
    fixture.records.Station[0].GeoInfo.Coordinates.pop();
    expect(() => parseWeather(fixture)).toThrow();
  });
});
describe("scientific missingness and timestamps", () => {
  it.each([
    "",
    " ",
    "-",
    "X",
    "T",
    -99,
    -98,
    null,
    undefined,
    true,
    Infinity,
    [],
    [0],
    ["42"],
    {},
    "0x20",
  ])("does not invent a numeric measurement for %s", (value) =>
    expect(measurement(value)).toBeNull(),
  );
  it("distinguishes valid zero from missing data", () =>
    expect(measurement("0")).toBe(0));
  it("normalizes local Taiwan times to UTC", () => {
    expect(taiwanTime("2026-11-15 08:00:00")).toBe("2026-11-15T00:00:00.000Z");
    expect(taiwanTime("bad")).toBeNull();
  });
  it.each([
    "2026-02-30 08:00:00",
    "2025-02-29T08:00:00+08:00",
    "2026-04-31 08:00:00",
    "2026-11-15T24:00:00+08:00",
    "2026-11-15T08:00:00+15:00",
  ])("rejects impossible report time %s", (value) =>
    expect(taiwanTime(value)).toBeNull(),
  );
  it("preserves valid leap days and explicit UTC offsets", () => {
    expect(taiwanTime("2024-02-29T08:00:00+08:00")).toBe(
      "2024-02-29T00:00:00.000Z",
    );
    expect(taiwanTime("2026-11-15T00:00:00Z")).toBe("2026-11-15T00:00:00.000Z");
  });
  it("old observations remain stale after a recent request; future timestamps are unavailable", () => {
    const now = Date.parse("2026-11-15T05:00:00Z");
    expect(observationFreshness("aqi", "2026-11-15T00:00:00Z", now)).toBe(
      "stale",
    );
    expect(observationFreshness("weather", "2026-11-15T04:00:00Z", now)).toBe(
      "fresh",
    );
    expect(observationFreshness("weather", "2026-11-16T04:00:00Z", now)).toBe(
      "unavailable",
    );
  });
});
