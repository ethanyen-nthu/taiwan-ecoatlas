import { describe, expect, it } from "vitest";
import { summariseToday } from "@/lib/today";
import { todayAsOf, todayFigures } from "@/components/today/figures";
import type { DatasetResponse, Observation } from "@/lib/types";
import type { ReservoirReading, ReservoirResponse } from "@/lib/reservoirs";

const at = "2026-11-26T07:00:00.000Z";
const obs = (
  id: string,
  values: Observation["values"],
  extra: Partial<Observation> = {},
): Observation => ({
  id,
  source: "x",
  station: id,
  county: "臺北市",
  longitude: 121,
  latitude: 25,
  observedAt: at,
  publishedAt: null,
  status: null,
  values,
  ...extra,
});
const dataset = (
  status: DatasetResponse["status"],
  observations: Observation[],
): DatasetResponse => ({
  source: "x",
  status,
  observations,
  lastObservationAt: observations.length ? at : null,
  publishedAt: null,
  retrievedAt: at,
  checkedAt: at,
  excluded: 0,
  duplicates: 0,
  message: null,
});
const reading = (
  id: string,
  name: string,
  storage: number | null,
  capacity: number | null,
): ReservoirReading => ({
  id,
  name,
  region: "north",
  observedAt: at,
  storageMcm: storage,
  capacityMcm: capacity,
  percent: storage !== null && capacity ? (storage / capacity) * 100 : null,
  levelM: null,
  fullLevelM: null,
  belowFullM: null,
  catchmentRainMm: null,
});
const reservoirs = (readings: ReservoirReading[]): ReservoirResponse => ({
  status: "fresh",
  readings,
  lastObservationAt: at,
  retrievedAt: at,
  checkedAt: at,
  message: null,
});

const air = dataset("fresh", [
  obs("a", { aqi: 40 }, { status: "良好" }),
  obs("b", { aqi: 60 }, { status: "普通" }),
  obs("c", { aqi: 80 }, { status: "普通" }),
]);
const weather = dataset("fresh", [
  obs("w1", { temperature: 20, rainfall: 0 }),
  obs("w2", { temperature: 24, rainfall: 12.5 }),
  obs("w3", { temperature: 3.2, rainfall: 0.5 }),
  obs("w4", { temperature: null, rainfall: null }),
]);
const water = reservoirs([
  reading("1", "石門水庫", 100, 200),
  reading("2", "曾文水庫", 300, 400),
  reading("3", "小水庫", 1, 2),
  reading("4", "無資料水庫", null, null),
]);

describe("summariseToday", () => {
  const today = summariseToday(air, weather, water, at);
  it("takes the middle air reading", () => {
    expect(today.air.medianAqi).toBe(60);
    expect(today.air.band).toBe("普通");
    expect(today.air.bandEnglish).toBe("Moderate");
    expect(today.air.reporting).toBe(3);
  });
  it("takes the middle temperature and counts rain only where it is reported", () => {
    expect(today.weather.medianTemperature).toBe(20);
    expect(today.weather.warmest?.value).toBe(24);
    expect(today.weather.coolest?.value).toBe(3.2);
    expect(today.weather.rainReporting).toBe(3);
    expect(today.weather.raining).toBe(2);
  });
  it("combines only the large reservoirs and names the lowest", () => {
    expect(today.reservoirs.large).toBe(2);
    expect(today.reservoirs.percent).toBeCloseTo((400 / 600) * 100, 6);
    expect(today.reservoirs.lowest?.nameZh).toBe("石門水庫");
    expect(today.reservoirs.lowest?.nameEn).toBe("Shihmen Reservoir");
    expect(today.reservoirs.lowest?.percent).toBe(50);
  });
  it("leaves nulls, not zeros, where a feed has nothing", () => {
    const empty = summariseToday(
      dataset("not-configured", []),
      dataset("unavailable", []),
      reservoirs([]),
      at,
    );
    expect(empty.air.medianAqi).toBeNull();
    expect(empty.weather.medianTemperature).toBeNull();
    expect(empty.weather.rainReporting).toBe(0);
    expect(empty.reservoirs.percent).toBeNull();
    expect(empty.reservoirs.lowest).toBeNull();
    expect(todayFigures(empty, "en")).toEqual([]);
    expect(todayAsOf(empty)).toBeNull();
  });
});

describe("todayFigures", () => {
  const today = summariseToday(air, weather, water, at);
  it("gives four figures, each linking to its own page", () => {
    const figures = todayFigures(today, "en");
    expect(figures.map((f) => f.key)).toEqual([
      "air",
      "temperature",
      "rain",
      "reservoirs",
    ]);
    expect(figures.map((f) => f.href)).toEqual([
      "/environment",
      "/environment/weather",
      "/environment/weather",
      "/environment/reservoirs",
    ]);
    const [aqi, temp, rain, res] = figures;
    expect([aqi.value, aqi.unit]).toEqual(["60", "Moderate"]);
    expect([temp.value, temp.unit]).toEqual(["20.0", "°C"]);
    expect([rain.value, rain.unit]).toEqual(["2", "of 3 stations"]);
    expect([res.value, res.unit]).toEqual(["66.7", "% full"]);
    expect(res.detail).toContain("lowest Shihmen Reservoir at 50.0%");
    expect(temp.detail).toContain("3.2–24.0 °C");
  });
  it("names the air band in words and gives it a dot colour", () => {
    const [aqi] = todayFigures(today, "zh");
    expect(aqi.unit).toBe("普通");
    expect(aqi.dot).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it("never colours the reservoir figure", () => {
    const res = todayFigures(today, "en").find((f) => f.key === "reservoirs");
    expect(res?.dot).toBeUndefined();
  });
  it("says 0 of N when stations report and none has rain", () => {
    const dry = summariseToday(
      air,
      dataset("fresh", [
        obs("w1", { temperature: 20, rainfall: 0 }),
        obs("w2", { temperature: 22, rainfall: 0 }),
      ]),
      water,
      at,
    );
    const rain = todayFigures(dry, "en").find((f) => f.key === "rain");
    expect([rain?.value, rain?.unit]).toEqual(["0", "of 2 stations"]);
  });
  it("leaves out a part that has no reading", () => {
    const partial = summariseToday(
      dataset("not-configured", []),
      weather,
      reservoirs([]),
      at,
    );
    expect(todayFigures(partial, "en").map((f) => f.key)).toEqual([
      "temperature",
      "rain",
    ]);
  });
  it("marks a stale feed as an older reading", () => {
    const stale = summariseToday(
      dataset("stale", air.observations),
      weather,
      water,
      at,
    );
    expect(todayFigures(stale, "en")[0].older).toBe(true);
    expect(todayFigures(stale, "en")[1].older).toBe(false);
  });
  it("reports the newest reading time", () => {
    expect(todayAsOf(today)).toBe(at);
  });
});
