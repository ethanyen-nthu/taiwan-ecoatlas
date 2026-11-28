import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ageWords,
  circleRing,
  cycloneClass,
  cycloneName,
  destination,
  intensityBand,
  intensityText,
  latestFeltQuake,
  mergeEarthquakes,
  parseCoordinate,
  parseCyclones,
  parseEarthquakes,
  parseIntensity,
  quadrantRing,
  taipeiTime,
} from "@/lib/hazards";
import {
  byStrength,
  countyName,
  earthquakeLine,
  typhoonLine,
  type HazardsResponse,
} from "@/lib/hazards";
import { cycloneFeatures, quakeFeatures, quakeRadius } from "@/lib/hazard-geo";
import { hazardFigures } from "@/components/today/figures";
import { HazardService } from "@/server/hazards";

// Every record below is synthetic and shaped after CWA's published field
// names. They exist only in these tests; the site never uses them.
const quakeCamel = {
  success: "true",
  records: {
    datasetDescription: "地震報告",
    earthquake: [
      {
        earthquakeNo: 115021,
        reportType: "地震速報",
        reportContent: "測試：花蓮縣近海發生規模 5.6 有感地震",
        web: "https://www.cwa.gov.tw/V8/C/E/EQ/EQ115021.html",
        earthquakeInfo: {
          originTime: "2026-11-27 21:04:10",
          focalDepth: 18.4,
          epiCenter: {
            location: "花蓮縣政府東南東方 31.0 公里",
            epiCenterLat: 23.88,
            epiCenterLon: 121.9,
          },
          magnitude: { magnitudeType: "芮氏規模", magnitudeValue: 5.6 },
        },
        intensity: {
          shakingArea: [
            {
              areaName: "宜蘭縣",
              areaIntensity: { unit: "級", value: 3 },
            },
            {
              areaName: "花蓮縣",
              areaIntensity: { unit: "級", value: "5弱" },
            },
          ],
        },
      },
    ],
  },
};
const quakePascal = {
  success: "true",
  records: {
    Earthquake: [
      {
        EarthquakeNo: 115022,
        ReportContent: "測試：臺東縣近海發生規模 4.1 有感地震",
        Web: "https://www.cwa.gov.tw/V8/C/E/EQ/EQ115022.html",
        EarthquakeInfo: {
          OriginTime: "2026-11-28 02:15:00",
          FocalDepth: 9.0,
          Epicenter: {
            Location: "臺東縣政府北方 20.0 公里",
            EpicenterLatitude: 23.1,
            EpicenterLongitude: 121.2,
          },
          EarthquakeMagnitude: {
            MagnitudeType: "芮氏規模",
            MagnitudeValue: 4.1,
          },
        },
        Intensity: {
          ShakingArea: [
            { CountyName: "臺東縣", AreaIntensity: "4級" },
            { CountyName: "花蓮縣", AreaIntensity: "2級" },
          ],
        },
      },
    ],
  },
};

const fix = (extra: Record<string, unknown>) => ({
  coordinate: "125.4,21.2",
  maxWindSpeed: "35",
  maxGustSpeed: "45",
  pressure: "955",
  movingSpeed: "18",
  movingDirection: "WNW",
  ...extra,
});
const cycloneCamel = {
  success: "true",
  records: {
    tropicalCyclones: {
      tropicalCyclone: [
        {
          typhoonName: "TESTNAME",
          cwaTyphoonName: "測試",
          cwaTyNo: "27",
          analysisData: {
            fix: [
              fix({
                fixTime: "2026-11-27T08:00:00+08:00",
                coordinate: "128.0,19.0",
              }),
              fix({
                fixTime: "2026-11-27T20:00:00+08:00",
                circleOf15Ms: {
                  radius: "180",
                  quadrantRadii: {
                    quadrantRadius: [
                      { radius: "200", dir: "NE" },
                      { radius: "180", dir: "SE" },
                      { radius: "150", dir: "SW" },
                      { radius: "170", dir: "NW" },
                    ],
                  },
                },
                circleOf25Ms: { radius: "70" },
              }),
            ],
          },
          forecastData: {
            fix: [
              fix({
                initTime: "2026-11-27T20:00:00+08:00",
                tau: "24",
                coordinate: "123.0,22.5",
                radiusOf70PercentProbability: "120",
              }),
              fix({
                initTime: "2026-11-27T20:00:00+08:00",
                tau: "12",
                coordinate: "124.2,21.8",
                radiusOf70PercentProbability: "70",
              }),
            ],
          },
        },
      ],
    },
  },
};
const cyclonePascal = {
  records: {
    TropicalCyclones: {
      TropicalCyclone: {
        TyphoonName: "PASCALTEST",
        CwaTdNo: "05",
        AnalysisData: {
          Fix: {
            FixTime: "2026-11-27 20:00:00",
            Coordinate: "132.5,17.0",
            MaxWindSpeed: 14,
          },
        },
      },
    },
  },
};

describe("times and coordinates", () => {
  it("reads CWA's offset-less local times as Taipei time", () => {
    expect(taipeiTime("2026-11-27 21:04:10")).toBe("2026-11-27T13:04:10.000Z");
    expect(taipeiTime("2026-11-27T21:04:10+08:00")).toBe(
      "2026-11-27T13:04:10.000Z",
    );
    expect(taipeiTime("yesterday")).toBeNull();
    expect(taipeiTime(null)).toBeNull();
  });
  it("finds the longitude whichever order the pair is in, and refuses nonsense", () => {
    expect(parseCoordinate("125.4,21.2")).toEqual({
      longitude: 125.4,
      latitude: 21.2,
    });
    expect(parseCoordinate("21.2 125.4")).toEqual({
      longitude: 125.4,
      latitude: 21.2,
    });
    expect(parseCoordinate("21.2,30.1")).toBeNull();
    expect(parseCoordinate("125.4")).toBeNull();
    expect(parseCoordinate("a,b")).toBeNull();
  });
});

describe("seismic intensity", () => {
  it("reads every way CWA writes it and keeps weak and strong apart", () => {
    expect(parseIntensity(4)).toEqual({ label: "4", rank: 4 });
    expect(parseIntensity("4級")).toEqual({ label: "4", rank: 4 });
    expect(parseIntensity({ unit: "級", value: "5弱" })).toEqual({
      label: "5弱",
      rank: 5,
    });
    expect(parseIntensity("5強")).toEqual({ label: "5強", rank: 5.5 });
    expect(parseIntensity("6弱")?.rank).toBe(6);
    expect(parseIntensity("6強")?.rank).toBe(6.5);
    expect(parseIntensity("7")?.rank).toBe(7);
  });
  it("refuses values that are not on the scale instead of guessing", () => {
    expect(parseIntensity("8")).toBeNull();
    expect(parseIntensity("3強")).toBeNull();
    expect(parseIntensity("strong")).toBeNull();
    expect(parseIntensity(null)).toBeNull();
    expect(parseIntensity("")).toBeNull();
  });
  it("groups into the five legend bands, with unknown kept apart", () => {
    const band = (value: string | null) =>
      intensityBand(value ? parseIntensity(value) : null);
    expect(band("1")).toBe("1-2");
    expect(band("2")).toBe("1-2");
    expect(band("3")).toBe("3");
    expect(band("4")).toBe("4");
    expect(band("5強")).toBe("5");
    expect(band("6弱")).toBe("6-7");
    expect(band(null)).toBe("unknown");
  });
  it("words it in both languages", () => {
    const five = parseIntensity("5弱")!;
    expect(intensityText(five, "en")).toBe("5 weak");
    expect(intensityText(five, "zh")).toBe("5弱級");
  });
});

describe("earthquake reports", () => {
  it("reads the camelCase layout", () => {
    const { items, excluded } = parseEarthquakes(quakeCamel, "significant");
    expect(excluded).toBe(0);
    expect(items).toHaveLength(1);
    const q = items[0];
    expect(q.originTime).toBe("2026-11-27T13:04:10.000Z");
    expect(q.latitude).toBe(23.88);
    expect(q.longitude).toBe(121.9);
    expect(q.magnitude).toBe(5.6);
    expect(q.depthKm).toBe(18.4);
    expect(q.maxIntensity?.label).toBe("5弱");
    expect(q.areas.map((a) => a.county)).toEqual(["花蓮縣", "宜蘭縣"]);
    expect(q.reportUrl).toBe("https://www.cwa.gov.tw/V8/C/E/EQ/EQ115021.html");
  });
  it("splits summary rows that name several counties and keeps each county's strongest intensity", () => {
    const area = (name: string, value: number) => ({
      areaName: name,
      areaIntensity: { unit: "級", value },
    });
    const report = (time: string) => ({
      earthquakeNo: 115000,
      earthquakeInfo: {
        originTime: time,
        epiCenter: {
          location: "花蓮縣政府北北東方  29.4  公里",
          epiCenterLat: 24.25,
          epiCenterLon: 121.68,
        },
        magnitude: { magnitudeValue: 3.1 },
      },
      intensity: {
        shakingArea: [
          area("臺東縣", 2),
          area("臺東縣", 4),
          area("花蓮縣、宜蘭縣", 3),
          area("花蓮縣", 1),
        ],
      },
    });
    const { items } = parseEarthquakes(
      {
        records: {
          earthquake: [
            report("2026-11-26 17:24:53"),
            report("2026-11-26 08:43:47"),
          ],
        },
      },
      "local",
    );
    expect(items[0].areas).toEqual([
      { county: "臺東縣", intensity: { label: "4", rank: 4 } },
      { county: "花蓮縣", intensity: { label: "3", rank: 3 } },
      { county: "宜蘭縣", intensity: { label: "3", rank: 3 } },
    ]);
    expect(items[0].maxIntensity?.rank).toBe(4);
    // Whitespace the agency pads its distances with is collapsed.
    expect(items[0].locationZh).toBe("花蓮縣政府北北東方 29.4 公里");
    // Every small-area report carries the same number, so the id adds the
    // time and two reports are never mistaken for one.
    expect(items[0].number).toBe("115000");
    expect(items[0].id).not.toBe(items[1].id);
    expect(new Set(items.map((item) => item.id)).size).toBe(2);
  });
  it("reads the PascalCase layout the same way", () => {
    const { items } = parseEarthquakes(quakePascal, "local");
    expect(items).toHaveLength(1);
    expect(items[0].magnitude).toBe(4.1);
    expect(items[0].maxIntensity?.rank).toBe(4);
    expect(items[0].feed).toBe("local");
  });
  it("keeps a missing magnitude or intensity as null, never zero", () => {
    const bare = {
      records: {
        earthquake: [
          {
            earthquakeInfo: {
              originTime: "2026-11-27 10:00:00",
              epiCenter: { epiCenterLat: 24, epiCenterLon: 121 },
            },
          },
        ],
      },
    };
    const q = parseEarthquakes(bare, "local").items[0];
    expect(q.magnitude).toBeNull();
    expect(q.depthKm).toBeNull();
    expect(q.maxIntensity).toBeNull();
    expect(q.areas).toEqual([]);
  });
  it("counts and leaves out records it cannot read in full", () => {
    const mixed = {
      records: {
        earthquake: [
          ...quakeCamel.records.earthquake,
          { earthquakeInfo: { originTime: "not a time" } },
          {
            earthquakeInfo: {
              originTime: "2026-11-27 10:00:00",
              epiCenter: { epiCenterLat: 99, epiCenterLon: 10 },
            },
          },
        ],
      },
    };
    const { items, excluded } = parseEarthquakes(mixed, "significant");
    expect(items).toHaveLength(1);
    expect(excluded).toBe(2);
  });
  it("treats an empty or missing list as no earthquakes, and no container as an error", () => {
    expect(parseEarthquakes({ records: { earthquake: [] } }, "local")).toEqual({
      items: [],
      excluded: 0,
    });
    expect(
      parseEarthquakes({ records: { datasetDescription: "x" } }, "local").items,
    ).toEqual([]);
    expect(() => parseEarthquakes({ success: "false" }, "local")).toThrow();
    expect(() => parseEarthquakes([], "local")).toThrow();
    expect(parseEarthquakes({ records: {} }, "local").items).toEqual([]);
    expect(() =>
      parseEarthquakes({ records: { somethingElse: [] } }, "local"),
    ).toThrow();
  });
  it("keeps one copy of an earthquake in both feeds, preferring the significant report, newest first", () => {
    const sig = parseEarthquakes(quakeCamel, "significant").items;
    const dup = parseEarthquakes(quakeCamel, "local").items.map((q) => ({
      ...q,
      id: "local-dup",
      latitude: q.latitude + 0.05,
    }));
    const other = parseEarthquakes(quakePascal, "local").items;
    const merged = mergeEarthquakes([dup, sig, other]);
    expect(merged).toHaveLength(2);
    expect(merged[0].originTime > merged[1].originTime).toBe(true);
    expect(merged.find((q) => q.magnitude === 5.6)?.feed).toBe("significant");
  });
  it("picks the newest earthquake within a week for the strip, otherwise none", () => {
    const events = mergeEarthquakes([
      parseEarthquakes(quakeCamel, "significant").items,
      parseEarthquakes(quakePascal, "local").items,
    ]);
    const now = Date.parse("2026-11-28T03:00:00Z");
    expect(latestFeltQuake(events, now)?.magnitude).toBe(4.1);
    expect(latestFeltQuake(events, now + 8 * 86_400_000)).toBeNull();
    expect(latestFeltQuake([], now)).toBeNull();
  });
});

describe("tropical cyclone tracks", () => {
  it("reads past and forecast fixes in time order", () => {
    const { items } = parseCyclones(cycloneCamel);
    expect(items).toHaveLength(1);
    const c = items[0];
    expect(c.nameEn).toBe("TESTNAME");
    expect(c.nameZh).toBe("測試");
    expect(c.number).toBe("27");
    expect(c.past.map((f) => f.longitude)).toEqual([128.0, 125.4]);
    expect(c.current?.time).toBe("2026-11-27T12:00:00.000Z");
    expect(c.current?.maxWindMs).toBe(35);
    expect(c.forecast.map((f) => f.tauHours)).toEqual([12, 24]);
    expect(c.forecast[0].time).toBe("2026-11-28T00:00:00.000Z");
    expect(c.forecast[1].radius70).toBe(120);
  });
  describe("the layout the agency serves today", () => {
    // Field names are those of the live feed; every value here is synthetic.
    const liveFix = (extra: Record<string, unknown> = {}) => ({
      DateTime: "2026-11-27T20:00:00+08:00",
      CoordinateLongitude: "125.4",
      CoordinateLatitude: "21.2",
      MaxWindSpeed: "35",
      MaxGustSpeed: "45",
      Pressure: "955",
      MovingSpeed: "18",
      MovingDirection: "WNW",
      ...extra,
    });
    const live = (circle: unknown) => ({
      records: {
        DataId: "W-C0034-005",
        Note: "synthetic",
        TropicalCyclones: {
          TropicalCyclone: [
            {
              Year: "2026",
              TyphoonName: "TESTNAME",
              CwaTyphoonName: "測試",
              CwaTdNo: "25",
              CwaTyNo: "",
              AnalysisData: {
                Fix: [
                  liveFix({
                    DateTime: "2026-11-27T08:00:00+08:00",
                    CoordinateLongitude: "128.0",
                    CoordinateLatitude: "19.0",
                  }),
                  liveFix({ Circle15ms: circle }),
                ],
              },
              ForecastData: {
                Fix: [
                  {
                    InitialTime: "2026-11-27T20:00:00+08:00",
                    ForecastHour: "12",
                    CoordinateLongitude: "123.1",
                    CoordinateLatitude: "22.4",
                    MaxWindSpeed: "38",
                    Radius70PercentProbability: "90",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    it("reads a longitude and a latitude of their own, DateTime and ForecastHour", () => {
      const { items, excluded } = parseCyclones(live({ Radius: "180" }));
      expect(excluded).toBe(0);
      const c = items[0];
      expect(c.nameEn).toBe("TESTNAME");
      expect(c.nameZh).toBe("測試");
      expect(c.number).toBe("25");
      expect(c.past.map((f) => [f.longitude, f.latitude])).toEqual([
        [128, 19],
        [125.4, 21.2],
      ]);
      expect(c.current?.time).toBe("2026-11-27T12:00:00.000Z");
      expect(c.current?.maxWindMs).toBe(35);
      expect(c.forecast).toHaveLength(1);
      expect(c.forecast[0].tauHours).toBe(12);
      expect(c.forecast[0].time).toBe("2026-11-28T00:00:00.000Z");
      expect(c.forecast[0].radius70).toBe(90);
      expect(c.current?.radius15).toBe(180);
      expect(c.current?.radius15Quadrants).toBeNull();
    });
    it("reads the four quadrants however they are nested, or none", () => {
      const four = { NE: 200, SE: 180, SW: 150, NW: 170 };
      const quadrants = (circle: unknown) =>
        parseCyclones(live(circle)).items[0].current?.radius15Quadrants;
      expect(
        quadrants({
          Radius: "180",
          QuadrantRadii: {
            QuadrantRadius: [
              { Direction: "NE", Radius: "200" },
              { Direction: "SE", Radius: "180" },
              { Direction: "SW", Radius: "150" },
              { Direction: "NW", Radius: "170" },
            ],
          },
        }),
      ).toEqual(four);
      expect(
        quadrants({
          Radius: "180",
          QuadrantRadii: {
            Radius: [
              { Quadrant: "NE", Value: "200" },
              { Quadrant: "SE", Value: "180" },
              { Quadrant: "SW", Value: "150" },
              { Quadrant: "NW", Value: "170" },
            ],
          },
        }),
      ).toEqual(four);
      expect(
        quadrants({
          Radius: "180",
          QuadrantRadii: { NE: "200", SE: "180", SW: "150", NW: "170" },
        }),
      ).toEqual(four);
      // Three of four is not enough to draw a quadrant circle.
      expect(
        quadrants({
          Radius: "180",
          QuadrantRadii: { NE: "200", SE: "180", SW: "150" },
        }),
      ).toBeNull();
    });
    it("takes a records block with only its metadata as no cyclone, not as unreadable", () => {
      expect(
        parseCyclones({ records: { DataId: "W-C0034-005", Note: "none" } }),
      ).toEqual({ items: [], excluded: 0 });
    });
  });
  it("reads wind radii, with the four quadrants only when all four are given", () => {
    const c = parseCyclones(cycloneCamel).items[0];
    expect(c.current?.radius15).toBe(180);
    expect(c.current?.radius25).toBe(70);
    expect(c.current?.radius15Quadrants).toEqual({
      NE: 200,
      SE: 180,
      SW: 150,
      NW: 170,
    });
    expect(c.past[0].radius15).toBeNull();
    expect(c.past[0].radius15Quadrants).toBeNull();
  });
  it("reads the PascalCase layout with a single record in place of a list", () => {
    const { items } = parseCyclones(cyclonePascal);
    expect(items).toHaveLength(1);
    expect(items[0].number).toBe("05");
    expect(items[0].current?.maxWindMs).toBe(14);
    expect(items[0].forecast).toEqual([]);
    expect(items[0].current?.time).toBe("2026-11-27T12:00:00.000Z");
  });
  it("calls an empty list no active cyclone, and a payload it cannot recognise an error", () => {
    expect(
      parseCyclones({ records: { tropicalCyclones: { tropicalCyclone: [] } } }),
    ).toEqual({ items: [], excluded: 0 });
    expect(parseCyclones({ records: { tropicalCyclones: {} } }).items).toEqual(
      [],
    );
    expect(
      parseCyclones({ records: { tropicalCyclones: null } }).items,
    ).toEqual([]);
    expect(parseCyclones({ records: {} }).items).toEqual([]);
    expect(() => parseCyclones({ records: { somethingElse: 1 } })).toThrow();
    expect(() => parseCyclones({ success: "false" })).toThrow();
    expect(() => parseCyclones("<html>")).toThrow();
  });
  it("counts a cyclone with no usable analysis fix instead of inventing a position", () => {
    const broken = {
      records: {
        tropicalCyclones: {
          tropicalCyclone: [
            { typhoonName: "NOFIX", analysisData: { fix: [] } },
            ...cycloneCamel.records.tropicalCyclones.tropicalCyclone,
          ],
        },
      },
    };
    const { items, excluded } = parseCyclones(broken);
    expect(items).toHaveLength(1);
    expect(excluded).toBe(1);
  });
  it("classes by CWA's wind thresholds and names it in the reader's language", () => {
    expect(cycloneClass(null)).toBeNull();
    expect(cycloneClass(17.1)).toBe("depression");
    expect(cycloneClass(17.2)).toBe("mild");
    expect(cycloneClass(32.6)).toBe("mild");
    expect(cycloneClass(32.7)).toBe("moderate");
    expect(cycloneClass(50.9)).toBe("moderate");
    expect(cycloneClass(51)).toBe("intense");
    const c = parseCyclones(cycloneCamel).items[0];
    expect(cycloneName(c, "en")).toBe("TESTNAME");
    expect(cycloneName(c, "zh")).toBe("測試");
    const d = parseCyclones(cyclonePascal).items[0];
    expect(cycloneName(d, "zh")).toBe("PASCALTEST");
  });
});

describe("drawing geometry", () => {
  it("puts a ring at the stated distance from its centre", () => {
    const ring = circleRing(125, 21, 100);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    const km = ([lon, lat]: number[]) => {
      const dLat = ((lat - 21) * Math.PI) / 180;
      const dLon = ((lon - 125) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((21 * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
    };
    for (const point of ring) expect(km(point)).toBeCloseTo(100, 0);
  });
  it("heads north, east, south and west along the right bearings", () => {
    const north = destination(125, 21, 111.2, 0);
    expect(north[0]).toBeCloseTo(125, 5);
    expect(north[1]).toBeGreaterThan(21.99);
    expect(destination(125, 21, 100, 90)[0]).toBeGreaterThan(125);
    expect(destination(125, 21, 100, 180)[1]).toBeLessThan(21);
    expect(destination(125, 21, 100, 270)[0]).toBeLessThan(125);
  });
  it("sets each quadrant of a wind ring to its own radius", () => {
    const ring = quadrantRing(125, 21, { NE: 300, SE: 100, SW: 100, NW: 100 });
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    const [lon, lat] = ring[9]; // middle of the north-east quadrant
    expect(lon).toBeGreaterThan(125 + 1.5);
    expect(lat).toBeGreaterThan(21 + 1.5);
    const [swLon, swLat] = ring[19 * 2 + 9]; // middle of the south-west quadrant
    expect(125 - swLon).toBeGreaterThan(0.5);
    expect(125 - swLon).toBeLessThan(0.9);
    expect(21 - swLat).toBeGreaterThan(0.5);
    expect(21 - swLat).toBeLessThan(0.8);
  });
});

describe("saying how long ago", () => {
  const now = Date.parse("2026-11-28T06:00:00Z");
  const ago = (ms: number, lang: "en" | "zh" = "en") =>
    ageWords(new Date(now - ms).toISOString(), now, lang);
  it("moves from minutes to hours to days", () => {
    expect(ago(20_000)).toBe("just now");
    expect(ago(12 * 60_000)).toBe("12 min ago");
    expect(ago(3 * 3600_000)).toBe("3 h ago");
    expect(ago(5 * 86_400_000)).toBe("5 days ago");
    expect(ago(3 * 3600_000, "zh")).toBe("3 小時前");
  });
  it("will not describe a time in the future or one it cannot read", () => {
    expect(
      ageWords(new Date(now + 3600_000).toISOString(), now, "en"),
    ).toBeNull();
    expect(ageWords("soon", now, "en")).toBeNull();
  });
});

describe("the hazard service", () => {
  afterEach(() => vi.unstubAllEnvs());
  const clockAt = (start: number) => {
    let time = start;
    return {
      now: () => time,
      advance: (ms: number) => {
        time += ms;
      },
    };
  };
  const route = (
    payloads: Partial<
      Record<"E-A0015-001" | "E-A0016-001" | "W-C0034-005", unknown>
    >,
  ) =>
    vi.fn(async (url: string) => {
      const id = /datastore\/([A-Z0-9-]+)\?/.exec(
        url,
      )![1] as keyof typeof payloads;
      const payload = payloads[id];
      if (payload instanceof Error) throw payload;
      return payload;
    });

  it("never calls the agency without a key, and says so", async () => {
    vi.stubEnv("CWA_API_KEY", "");
    const fetchJson = vi.fn();
    const result = await new HazardService({
      fetchJson,
      now: () => 0,
    }).get();
    expect(fetchJson).not.toHaveBeenCalled();
    expect(result.earthquakes.status).toBe("not-configured");
    expect(result.typhoon.status).toBe("not-configured");
    expect(result.earthquakes.events).toEqual([]);
    expect(result.typhoon.cyclones).toEqual([]);
  });

  it("reports earthquakes and an empty typhoon list as fresh, not unavailable", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    const clock = clockAt(Date.parse("2026-11-28T03:00:00Z"));
    const fetchJson = route({
      "E-A0015-001": quakeCamel,
      "E-A0016-001": quakePascal,
      "W-C0034-005": { records: { tropicalCyclones: { tropicalCyclone: [] } } },
    });
    const result = await new HazardService({
      fetchJson,
      now: clock.now,
    }).get();
    expect(result.earthquakes.status).toBe("fresh");
    expect(result.earthquakes.events).toHaveLength(2);
    expect(result.earthquakes.message).toBeNull();
    expect(result.typhoon.status).toBe("fresh");
    expect(result.typhoon.cyclones).toEqual([]);
    expect(result.typhoon.feed).toBe("ok");
  });

  it("answers repeated requests from one copy until it expires", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    const clock = clockAt(Date.parse("2026-11-28T03:00:00Z"));
    const fetchJson = route({
      "E-A0015-001": quakeCamel,
      "E-A0016-001": quakePascal,
      "W-C0034-005": cycloneCamel,
    });
    const service = new HazardService({ fetchJson, now: clock.now });
    await Promise.all([service.get(), service.get(), service.get()]);
    expect(fetchJson).toHaveBeenCalledTimes(3);
    clock.advance(60_000);
    await service.get();
    expect(fetchJson).toHaveBeenCalledTimes(3);
    clock.advance(3 * 60_000);
    await service.get();
    // Earthquake feeds are refreshed after three minutes, the cyclone feed is not.
    expect(fetchJson).toHaveBeenCalledTimes(5);
    clock.advance(10 * 60_000);
    await service.get();
    expect(fetchJson).toHaveBeenCalledTimes(8);
  });

  it("keeps the last good earthquakes, flagged stale, when a refresh fails, and backs off", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const clock = clockAt(Date.parse("2026-11-28T03:00:00Z"));
    const payloads: Parameters<typeof route>[0] = {
      "E-A0015-001": quakeCamel,
      "E-A0016-001": quakePascal,
      "W-C0034-005": cycloneCamel,
    };
    const fetchJson = route(payloads);
    const service = new HazardService({ fetchJson, now: clock.now });
    await service.get();
    payloads["E-A0015-001"] = new Error("down");
    payloads["E-A0016-001"] = new Error("down");
    clock.advance(4 * 60_000);
    const result = await service.get();
    expect(result.earthquakes.status).toBe("stale");
    expect(result.earthquakes.events).toHaveLength(2);
    expect(result.earthquakes.message).toBe("upstream-unavailable");
    const calls = fetchJson.mock.calls.length;
    clock.advance(30_000);
    await service.get();
    expect(fetchJson.mock.calls.length).toBe(calls);
  });

  it("is unavailable, with no invented list, when the first read fails", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const clock = clockAt(Date.parse("2026-11-28T03:00:00Z"));
    const fetchJson = route({
      "E-A0015-001": new Error("down"),
      "E-A0016-001": new Error("down"),
      "W-C0034-005": new Error("down"),
    });
    const result = await new HazardService({
      fetchJson,
      now: clock.now,
    }).get();
    expect(result.earthquakes.status).toBe("unavailable");
    expect(result.earthquakes.events).toEqual([]);
    expect(result.typhoon.status).toBe("unavailable");
    expect(result.typhoon.message).toBe("upstream-unavailable");
  });

  it("calls an unrecognisable payload unreadable, never an empty list, and logs only field names", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const clock = clockAt(Date.parse("2026-11-28T03:00:00Z"));
    const fetchJson = route({
      "E-A0015-001": quakeCamel,
      "E-A0016-001": quakePascal,
      "W-C0034-005": { success: "false", message: "secret-looking text" },
    });
    const result = await new HazardService({
      fetchJson,
      now: clock.now,
    }).get();
    expect(result.typhoon.status).toBe("unavailable");
    expect(result.typhoon.feed).toBe("unreadable");
    expect(result.typhoon.message).toBe("unreadable-payload");
    expect(result.typhoon.cyclones).toEqual([]);
    expect(result.earthquakes.status).toBe("fresh");
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("source_payload_invalid");
    expect(logged).not.toContain("secret-looking text");
    expect(logged).not.toContain("test-key");
  });

  it("counts a cyclone it cannot read, logs only its field names, and does not call it none", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const clock = clockAt(Date.parse("2026-11-28T03:00:00Z"));
    const fetchJson = route({
      "E-A0015-001": quakeCamel,
      "E-A0016-001": quakePascal,
      "W-C0034-005": {
        records: {
          tropicalCyclones: {
            tropicalCyclone: [
              {
                typhoonName: "secret-looking name",
                analysisData: { fix: [{ fixTime: "2026-11-28 08:00:00" }] },
              },
            ],
          },
        },
      },
    });
    const result = await new HazardService({
      fetchJson,
      now: clock.now,
    }).get();
    expect(result.typhoon.status).toBe("fresh");
    expect(result.typhoon.cyclones).toEqual([]);
    expect(result.typhoon.excluded).toBe(1);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("source_record_excluded");
    expect(logged).toContain("analysisData");
    expect(logged).toContain("fixTime");
    expect(logged).not.toContain("secret-looking name");
    expect(logged).not.toContain("2026-11-28 08:00:00");
    expect(logged).not.toContain("test-key");
  });

  it("still shows one earthquake feed when the other is down, and says so", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const clock = clockAt(Date.parse("2026-11-28T03:00:00Z"));
    const fetchJson = route({
      "E-A0015-001": quakeCamel,
      "E-A0016-001": new Error("down"),
      "W-C0034-005": cycloneCamel,
    });
    const result = await new HazardService({
      fetchJson,
      now: clock.now,
    }).get();
    expect(result.earthquakes.status).toBe("fresh");
    expect(result.earthquakes.events).toHaveLength(1);
    expect(result.earthquakes.message).toBe("one-feed-missing");
    expect(result.earthquakes.feeds).toEqual({
      significant: "ok",
      local: "unavailable",
    });
    expect(result.typhoon.cyclones).toHaveLength(1);
  });
});

const section = (over: Record<string, unknown> = {}) => ({
  status: "fresh" as const,
  retrievedAt: "2026-11-28T03:00:00.000Z",
  message: null,
  excluded: 0,
  ...over,
});
const feeds = { significant: "ok", local: "ok" } as const;
const now = Date.parse("2026-11-28T03:00:00Z");
const quakes = () =>
  mergeEarthquakes([
    parseEarthquakes(quakeCamel, "significant").items,
    parseEarthquakes(quakePascal, "local").items,
  ]);
const hazardsWith = (over: Partial<HazardsResponse> = {}): HazardsResponse => ({
  checkedAt: "2026-11-28T03:00:00.000Z",
  earthquakes: section({ events: quakes(), feeds }) as never,
  typhoon: section({
    cyclones: parseCyclones(cycloneCamel).items,
    feed: "ok",
  }) as never,
  ...over,
});

describe("the sentence under each layer switch", () => {
  const empty = section({ events: [], feeds });
  it("says what the feed holds, with the oldest date so the window is clear", () => {
    const line = earthquakeLine(
      section({ events: quakes(), feeds }) as never,
      now,
      "en",
    )!;
    expect(line).toContain("2 felt earthquakes");
    expect(line).toContain("the newest 9 h ago");
    expect(line).toContain("27 Nov");
    expect(
      earthquakeLine(section({ events: quakes(), feeds }) as never, now, "zh"),
    ).toContain("2 筆有感地震");
  });
  it("says none reported only when the feed answered with none", () => {
    expect(earthquakeLine(empty as never, now, "en")).toContain(
      "no felt earthquakes",
    );
    expect(
      typhoonLine(section({ cyclones: [], feed: "ok" }) as never, now, "en"),
    ).toBe("No tropical cyclone is being tracked right now.");
    expect(
      typhoonLine(section({ cyclones: [], feed: "ok" }) as never, now, "zh"),
    ).toBe("目前沒有受追蹤的熱帶氣旋。");
  });
  it("never says none when the feed is down, unreadable or unconfigured", () => {
    for (const status of ["unavailable", "not-configured"] as const) {
      const down = section({
        status,
        cyclones: [],
        events: [],
        feeds,
      }) as never;
      for (const text of [
        earthquakeLine(down, now, "en"),
        typhoonLine(down, now, "en"),
        earthquakeLine(down, now, "zh"),
        typhoonLine(down, now, "zh"),
      ]) {
        expect(text).toBeTruthy();
        expect(text).not.toMatch(/no felt|no tropical|沒有有感|沒有受追蹤/i);
      }
    }
    const unreadable = section({
      status: "unavailable",
      message: "unreadable-payload",
      cyclones: [],
    }) as never;
    expect(typhoonLine(unreadable, now, "en")).toContain("could not be read");
  });
  it("marks a retained reading as the last one", () => {
    const stale = section({
      status: "stale",
      events: quakes(),
      feeds,
    }) as never;
    expect(earthquakeLine(stale, now, "en")).toContain("last reading");
  });
  it("names the cyclone, its class and how old the position is", () => {
    const line = typhoonLine(
      section({
        cyclones: parseCyclones(cycloneCamel).items,
        feed: "ok",
      }) as never,
      now,
      "en",
    );
    expect(line).toBe(
      "TESTNAME, moderate typhoon; position analysed 15 h ago.",
    );
    const both = parseCyclones(cycloneCamel).items.concat(
      parseCyclones(cyclonePascal).items,
    );
    expect(byStrength(both)[0].nameEn).toBe("TESTNAME");
    expect(
      typhoonLine(section({ cyclones: both, feed: "ok" }) as never, now, "en"),
    ).toBe("2 tropical cyclones are being tracked: TESTNAME, PASCALTEST.");
  });
  it("translates county names it knows and leaves the rest as written", () => {
    expect(countyName("花蓮縣", "en")).toBe("Hualien County");
    expect(countyName("台東縣", "en")).toBe("Taitung County");
    expect(countyName("臺東縣", "zh")).toBe("臺東縣");
    expect(countyName("某某縣", "en")).toBe("某某縣");
  });
});

describe("the Today strip figures", () => {
  it("shows the cyclone first, as the agency's map and not a warning", () => {
    const [typhoon, quake] = hazardFigures(hazardsWith(), "en", now);
    expect(typhoon).toMatchObject({
      key: "typhoon",
      value: "TESTNAME",
      unit: "Moderate typhoon",
      href: "/explore?layers=typhoon",
      alert: true,
    });
    expect(typhoon.detail).toContain("not a warning");
    expect(typhoon.detail).toContain("35 m/s");
    expect(quake).toMatchObject({ key: "quake", value: "M4.1" });
    expect(quake.detail).toContain("Taitung County");
    expect(quake.detail).toContain("intensity 4");
  });
  it("leaves out a cyclone when none is tracked and an earthquake older than a week, and shows nothing when the feeds are down", () => {
    const calm = hazardsWith({
      typhoon: section({ cyclones: [], feed: "ok" }) as never,
    });
    expect(hazardFigures(calm, "en", now).map((f) => f.key)).toEqual(["quake"]);
    expect(hazardFigures(calm, "en", now + 9 * 86_400_000)).toEqual([]);
    const down = hazardsWith({
      earthquakes: section({
        status: "unavailable",
        events: [],
        feeds,
      }) as never,
      typhoon: section({
        status: "unavailable",
        cyclones: [],
        feed: "unavailable",
      }) as never,
    });
    expect(hazardFigures(down, "en", now)).toEqual([]);
    expect(hazardFigures(null, "en", now)).toEqual([]);
  });
  it("flags a retained reading as older and words it in Chinese", () => {
    const stale = hazardsWith({
      earthquakes: section({
        status: "stale",
        events: quakes(),
        feeds,
      }) as never,
    });
    const figures = hazardFigures(stale, "zh", now);
    expect(figures.find((f) => f.key === "quake")).toMatchObject({
      older: true,
      value: "規模 4.1",
    });
    expect(figures[0].label).toBe("熱帶氣旋");
  });
});

describe("what the map draws", () => {
  it("sizes earthquake dots by magnitude and keeps an unreported one small and grey", () => {
    expect(quakeRadius(2)).toBe(3);
    expect(quakeRadius(5)).toBeCloseTo(12.6, 1);
    expect(quakeRadius(7)).toBeGreaterThan(quakeRadius(6));
    expect(quakeRadius(null)).toBe(4);
    const [q] = parseEarthquakes(quakeCamel, "significant").items;
    const bare = { ...q, magnitude: null, maxIntensity: null, areas: [] };
    const { features } = quakeFeatures([q, bare]);
    expect(features[0].properties?.color).toBe("#b02a2e");
    expect(features[1].properties?.color).toBe("#8d969e");
    expect(features[1].geometry.coordinates).toEqual([q.longitude, q.latitude]);
  });
  it("draws the track, the forecast from the latest position, wind areas and probability circles", () => {
    const { tracks, areas, fixes } = cycloneFeatures(
      parseCyclones(cycloneCamel).items,
    );
    const kinds = tracks.features.map((f) => f.properties?.kind);
    expect(kinds).toEqual(["past", "forecast"]);
    // The forecast line starts at the latest analysed position.
    expect(tracks.features[1].geometry.coordinates[0]).toEqual([125.4, 21.2]);
    expect(tracks.features[1].geometry.coordinates).toHaveLength(3);
    expect(areas.features.map((f) => f.properties?.kind).sort()).toEqual([
      "p70",
      "p70",
      "wind15",
      "wind25",
    ]);
    expect(
      fixes.features.filter((f) => f.properties?.kind === "current"),
    ).toHaveLength(1);
    expect(
      fixes.features.filter((f) => f.properties?.kind === "forecast"),
    ).toHaveLength(2);
    expect(
      fixes.features.filter((f) => f.properties?.kind === "past"),
    ).toHaveLength(1);
  });
  it("draws nothing for no cyclone, and no forecast line from a single position", () => {
    const none = cycloneFeatures([]);
    expect(none.tracks.features).toEqual([]);
    const single = cycloneFeatures(parseCyclones(cyclonePascal).items);
    expect(single.tracks.features).toEqual([]);
    expect(single.areas.features).toEqual([]);
    expect(single.fixes.features).toHaveLength(1);
  });
});
