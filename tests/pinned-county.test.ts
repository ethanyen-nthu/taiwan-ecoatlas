import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pinnedFigures } from "@/components/today/figures";
import { countyByCode, countyByZh, countyList } from "@/lib/county-list";
import type { OutlineFile } from "@/lib/outline-map";
import { parsePinned } from "@/lib/pinned-county";
import { summariseCounties, type TodaySummary } from "@/lib/today";
import type { Observation } from "@/lib/types";
import { loadTour } from "@/server/tour";

const at = "2026-11-28T03:00:00.000Z";
const obs = (
  id: string,
  county: string | null,
  values: Record<string, number | null>,
): Observation => ({
  id,
  source: "test",
  station: id,
  county,
  longitude: 121,
  latitude: 24,
  observedAt: at,
  publishedAt: null,
  status: null,
  values,
});

describe("the county list", () => {
  it("matches the county outlines and the atlas counties exactly", async () => {
    const outlines = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "public/data/county-outlines.json"),
        "utf8",
      ),
    ) as OutlineFile;
    const fromOutlines = Object.entries(outlines)
      .map(([code, county]) => ({ code, en: county.en, zh: county.name }))
      .sort((a, b) => a.code.localeCompare(b.code));
    expect(
      [...countyList].sort((a, b) => a.code.localeCompare(b.code)),
    ).toEqual(fromOutlines);
    const { counties } = await loadTour();
    expect(new Set(countyList.map((county) => county.code))).toEqual(
      new Set(counties.map((county) => county.code)),
    );
    for (const county of counties)
      expect(countyByCode(county.code)?.zh).toBe(county.zh);
    expect(countyList).toHaveLength(22);
  });

  it("finds a county by its Chinese name, 台 or 臺, and by nothing else", () => {
    expect(countyByZh("臺北市")?.code).toBe("63000");
    expect(countyByZh("台北市")?.code).toBe("63000");
    expect(countyByZh(" 臺東縣 ")?.code).toBe("10014");
    expect(countyByZh("火星縣")).toBeNull();
    expect(countyByZh(null)).toBeNull();
    expect(countyByCode("00000")).toBeNull();
  });
});

describe("parsePinned", () => {
  it("accepts only an official county code", () => {
    expect(parsePinned("63000")).toBe("63000");
    expect(parsePinned("99999")).toBeNull();
    expect(parsePinned("<script>")).toBeNull();
    expect(parsePinned("")).toBeNull();
    expect(parsePinned(null)).toBeNull();
    expect(parsePinned(undefined)).toBeNull();
  });
});

describe("summariseCounties", () => {
  const air = [
    obs("a1", "臺北市", { aqi: 40 }),
    obs("a2", "台北市", { aqi: 60 }),
    obs("a3", "南投縣", { aqi: null }),
    obs("a4", "火星縣", { aqi: 500 }),
    obs("a5", null, { aqi: 500 }),
  ];
  const weather = [
    obs("w1", "臺北市", { temperature: 22 }),
    obs("w2", "臺北市", { temperature: 24 }),
    obs("w3", "南投縣", { temperature: 3.2 }),
    obs("w4", "南投縣", { temperature: 19 }),
    obs("w5", "南投縣", { temperature: 21 }),
    obs("w6", "宜蘭縣", { temperature: null }),
  ];
  const result = summariseCounties(air, weather);

  it("takes the middle station of each county, joining 台 and 臺", () => {
    expect(result["63000"].air).toMatchObject({ medianAqi: 50, reporting: 2 });
    expect(result["63000"].weather).toEqual({
      medianTemperature: 23,
      stations: 2,
      coolest: 22,
      warmest: 24,
    });
    expect(result["10008"].weather).toMatchObject({
      medianTemperature: 19,
      stations: 3,
      coolest: 3.2,
      warmest: 21,
    });
  });

  it("leaves a part with no reading null, never zero", () => {
    expect(result["10008"].air).toBeNull();
    expect(result["10002"].weather).toBeNull();
    expect(result["10002"].air).toBeNull();
  });

  it("leaves out stations that name no known county", () => {
    expect(Object.keys(result).sort()).toEqual(["10002", "10008", "63000"]);
    expect(JSON.stringify(result)).not.toContain("500");
  });
});

describe("pinnedFigures", () => {
  const base = (): TodaySummary => ({
    checkedAt: at,
    air: {
      status: "fresh",
      stations: 80,
      reporting: 70,
      medianAqi: 54,
      band: "普通",
      bandEnglish: "Moderate",
      latest: at,
    },
    weather: {
      status: "fresh",
      stations: 800,
      medianTemperature: 21,
      warmest: null,
      coolest: null,
      rainReporting: 0,
      raining: 0,
      latest: at,
    },
    reservoirs: {
      status: "fresh",
      large: 0,
      percent: null,
      lowest: null,
      latest: at,
    },
    counties: summariseCounties(
      [obs("a1", "臺北市", { aqi: 40 }), obs("a2", "臺北市", { aqi: 60 })],
      [
        obs("w1", "臺北市", { temperature: 22 }),
        obs("w2", "臺北市", { temperature: 24 }),
      ],
    ),
  });

  it("names the county and its stations in either language", () => {
    const en = pinnedFigures(base(), "63000", "en");
    expect(en.map((figure) => figure.key)).toEqual([
      "county-air",
      "county-temperature",
    ]);
    expect(en[0]).toMatchObject({
      label: "Taipei City air (AQI)",
      value: "50",
      pin: true,
      href: "/county/63000",
    });
    expect(en[0].detail).toContain("the middle of 2 stations in Taipei City");
    expect(en[1]).toMatchObject({ value: "23.0", unit: "°C" });
    expect(en[1].detail).toContain("from 22.0–24.0 °C");
    const zh = pinnedFigures(base(), "63000", "zh");
    expect(zh[0].label).toBe("臺北市空氣（AQI）");
    expect(zh[1].label).toBe("臺北市氣溫");
  });

  it("shows nothing for a county with no readings or an unknown code", () => {
    expect(pinnedFigures(base(), "10002", "en")).toEqual([]);
    expect(pinnedFigures(base(), "99999", "en")).toEqual([]);
    const old = { ...base(), counties: undefined };
    expect(pinnedFigures(old, "63000", "en")).toEqual([]);
  });

  it("leaves out a part with no reading rather than showing zero", () => {
    const today = base();
    today.counties!["63000"].air = null;
    const figures = pinnedFigures(today, "63000", "en");
    expect(figures.map((figure) => figure.key)).toEqual(["county-temperature"]);
  });

  it("marks a figure older when its feed is stale", () => {
    const today = base();
    today.air.status = "stale";
    const [air, temperature] = pinnedFigures(today, "63000", "en");
    expect(air.older).toBe(true);
    expect(temperature.older).toBe(false);
  });
});
