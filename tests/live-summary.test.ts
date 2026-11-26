import { describe, expect, it } from "vitest";
import {
  inCounty,
  median,
  normaliseCounty,
  summariseAir,
  summariseWeather,
  weatherByCounty,
} from "@/lib/live-summary";
import type { Observation } from "@/lib/types";

// Synthetic stations, made up for these tests only.
const station = (
  id: string,
  county: string | null,
  values: Record<string, number | null>,
  observedAt = "2026-11-26T06:00:00.000Z",
): Observation => ({
  id,
  source: "test",
  station: `Station ${id}`,
  county,
  longitude: 121,
  latitude: 24,
  observedAt,
  publishedAt: null,
  status: null,
  values,
});

describe("county names", () => {
  it("treats 台 and 臺 as the same character", () => {
    expect(normaliseCounty("台北市")).toBe("臺北市");
    expect(normaliseCounty(" 臺南市 ")).toBe("臺南市");
    expect(normaliseCounty(null)).toBe("");
    expect(inCounty(station("a", "台中市", {}), "臺中市")).toBe(true);
    expect(inCounty(station("a", "臺中市", {}), "臺北市")).toBe(false);
  });
});

describe("median", () => {
  it("takes the middle value, or the mean of the two middle values", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("weather summaries", () => {
  const list = [
    station("1", "南投縣", {
      temperature: 2.1,
      rainfall: 0,
      humidity: 90,
      windSpeed: 8,
    }),
    station("2", "南投縣", {
      temperature: 20,
      rainfall: 4.5,
      humidity: 70,
      windSpeed: 2,
    }),
    station("3", "南投縣", {
      temperature: 22,
      rainfall: null,
      humidity: null,
      windSpeed: 1,
    }),
    station("4", "臺北市", {
      temperature: 21,
      rainfall: 0,
      humidity: 80,
      windSpeed: null,
    }),
  ];

  it("reports the middle station and the extremes with where they are", () => {
    const all = summariseWeather(list);
    expect(all.stations).toBe(4);
    expect(all.medianTemperature).toBe(20.5);
    expect(all.warmest).toMatchObject({ value: 22, station: "Station 3" });
    expect(all.coolest).toMatchObject({ value: 2.1, station: "Station 1" });
    expect(all.wettest).toMatchObject({ value: 4.5, station: "Station 2" });
    expect(all.windiest).toMatchObject({ value: 8, station: "Station 1" });
    expect(all.medianHumidity).toBe(80);
  });

  it("leaves a missing reading out instead of counting it as zero", () => {
    const nantou = weatherByCounty(list).find((c) => c.county === "南投縣")!;
    expect(nantou.stations).toBe(3);
    // Humidity: only two stations gave a figure, so the middle is their mean.
    expect(nantou.medianHumidity).toBe(80);
    // A 0.0 rainfall is a real reading; a null is not, and neither is the wettest here.
    expect(nantou.wettest!.value).toBe(4.5);
  });

  it("has no figure for a county where nothing was measured", () => {
    const none = summariseWeather([
      station("x", "連江縣", { temperature: null }),
    ]);
    expect(none.medianTemperature).toBeNull();
    expect(none.warmest).toBeNull();
    expect(summariseWeather([]).latest).toBeNull();
  });

  it("groups by county with 台 and 臺 merged", () => {
    const groups = weatherByCounty([
      station("1", "台北市", { temperature: 20 }),
      station("2", "臺北市", { temperature: 22 }),
      station("3", null, { temperature: 99 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      county: "臺北市",
      stations: 2,
      medianTemperature: 21,
    });
  });
});

describe("air summaries", () => {
  it("gives the middle station's AQI with the official band", () => {
    const air = summariseAir([
      station("1", "高雄市", { aqi: 29 }),
      station("2", "高雄市", { aqi: 55 }),
      station("3", "高雄市", { aqi: 110 }),
    ]);
    expect(air.medianAqi).toBe(55);
    expect(air.band).toBe("普通");
    expect(air.bandEnglish).toBe("Moderate");
    expect(air.highest).toEqual({ value: 110, station: "Station 3" });
    expect(air.reporting).toBe(3);
  });

  it("has no AQI when no station reports one", () => {
    const air = summariseAir([station("1", "連江縣", { aqi: null })]);
    expect(air.medianAqi).toBeNull();
    expect(air.band).toBeNull();
    expect(air.stations).toBe(1);
    expect(air.reporting).toBe(0);
    expect(summariseAir([]).medianAqi).toBeNull();
  });
});
