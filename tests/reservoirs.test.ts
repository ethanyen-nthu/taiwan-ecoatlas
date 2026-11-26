import { describe, expect, it, vi } from "vitest";
import {
  exceedsCapacity,
  joinReservoirs,
  parseDailyRows,
  parseStatusRows,
  reservoirLabel,
  reservoirRegion,
  summariseReservoirs,
  type StatusRow,
} from "@/lib/reservoirs";
import { ReservoirService } from "@/server/reservoirs";
import status from "./fixtures/wra-status.json";
import daily from "./fixtures/wra-daily.json";

// The two fixtures are rows trimmed from real Water Resources Agency
// responses read on 26 Nov 2026; test-only rows below are marked synthetic.
const joined = () =>
  joinReservoirs(parseStatusRows(status).rows, parseDailyRows(daily));
const byName = (name: string) => joined().find((r) => r.name === name)!;

describe("reading the Water Resources Agency feeds", () => {
  it("turns string values into numbers and keeps gaps as null, never zero", () => {
    const { rows } = parseStatusRows(status);
    const weir = rows.find((r) => r.id === "10802")!;
    expect(weir.storageWan).toBeNull();
    expect(weir.levelM).toBe(4.82);
    const empty = rows.find((r) => r.id === "50213")!;
    expect(empty.storageWan).toBe(0);
    expect(rows.find((r) => r.id === "30502")!.observedAt).toBe(
      "2026-11-26T06:00:00.000Z",
    );
  });

  it("rejects a payload that is not a non-empty array and counts unusable rows", () => {
    expect(() => parseStatusRows({ records: [] })).toThrow();
    expect(() => parseStatusRows([])).toThrow();
    expect(() => parseDailyRows("nope")).toThrow();
    const result = parseStatusRows([
      ...status,
      { reservoiridentifier: "", observationtime: "2026-11-26T07:00:00" },
      { reservoiridentifier: "99999", observationtime: "not a time" },
    ]);
    expect(result.excluded).toBe(2);
    expect(result.rows).toHaveLength(status.length);
  });

  it("reads upper-case keys the same way", () => {
    const { rows } = parseStatusRows([
      {
        ReservoirIdentifier: "10201",
        ObservationTime: "2026-11-26T14:00:00",
        EffectiveWaterStorageCapacity: "20227.02",
      },
    ]);
    expect(rows[0].storageWan).toBe(20227.02);
  });
});

describe("working out how full each reservoir is", () => {
  it("divides storage by capacity and converts 萬 m³ to million m³", () => {
    const zengwen = byName("曾文水庫");
    expect(zengwen.storageMcm).toBeCloseTo(388.25, 2);
    expect(zengwen.capacityMcm).toBeCloseTo(486.54, 2);
    expect(zengwen.percent).toBeCloseTo(79.8, 1);
    expect(zengwen.belowFullM).toBeCloseTo(5.56, 2);
    expect(zengwen.region).toBe("south");
    expect(byName("石門水庫").percent).toBeCloseTo(98.5, 1);
  });

  it("never caps a figure above 100%", () => {
    expect(byName("阿公店水庫").percent).toBeCloseTo(117.9, 1);
    expect(byName("阿公店水庫").belowFullM).toBeCloseTo(-0.87, 2);
  });

  it("flags a reading above 100% only when it still reads above 100% rounded", () => {
    expect(exceedsCapacity(100.007)).toBe(false); // shows as 100.0%
    expect(exceedsCapacity(100.049)).toBe(false);
    expect(exceedsCapacity(100.05)).toBe(true); // shows as 100.1%
    expect(exceedsCapacity(117.9)).toBe(true);
    expect(exceedsCapacity(99.9)).toBe(false);
  });

  it("gives no percentage when a figure is missing, and keeps the water level", () => {
    const weir = byName("羅東攔河堰");
    expect(weir.percent).toBeNull();
    expect(weir.capacityMcm).toBeNull();
    expect(weir.levelM).toBe(4.82);
    // 50213 has storage 0 but no capacity listed: still no percentage.
    const noName = joined().find((r) => r.id === "50213")!;
    expect(noName.name).toBeNull();
    expect(noName.percent).toBeNull();
    expect(noName.storageMcm).toBe(0);
  });

  it("keeps the newest reading that has a storage figure", () => {
    const rows: StatusRow[] = [
      // synthetic: an earlier reading with storage, a later one without
      {
        id: "10201",
        observedAt: "2026-11-26T05:00:00.000Z",
        storageWan: 20000,
        levelM: 244,
        catchmentRainMm: null,
      },
      {
        id: "10201",
        observedAt: "2026-11-26T06:00:00.000Z",
        storageWan: null,
        levelM: 244.5,
        catchmentRainMm: null,
      },
      // synthetic: two readings with storage, the later wins
      {
        id: "30502",
        observedAt: "2026-11-26T04:00:00.000Z",
        storageWan: 38000,
        levelM: 224,
        catchmentRainMm: null,
      },
      {
        id: "30502",
        observedAt: "2026-11-26T06:00:00.000Z",
        storageWan: 38825,
        levelM: 224.44,
        catchmentRainMm: null,
      },
    ];
    const result = joinReservoirs(rows, parseDailyRows(daily));
    expect(result.find((r) => r.id === "10201")!.storageMcm).toBe(200);
    expect(result.find((r) => r.id === "30502")!.storageMcm).toBeCloseTo(
      388.25,
      2,
    );
  });

  it("reads the region from the first two digits of the number", () => {
    expect(reservoirRegion("10201")).toBe("north");
    expect(reservoirRegion("20501")).toBe("central");
    expect(reservoirRegion("30502")).toBe("south");
    expect(reservoirRegion("40701")).toBe("east");
    expect(reservoirRegion("50109")).toBe("islands");
    expect(reservoirRegion("99999")).toBeNull();
  });
});

describe("summary of the large reservoirs", () => {
  it("counts only reservoirs of 10 million m³ or more, and flags those above 100%", () => {
    const summary = summariseReservoirs(joined());
    expect(summary.total).toBe(7);
    // Zengwen, Feitsui, Shihmen, Agongdian, Wushe have both figures and ≥ 10 million m³.
    expect(summary.large.map((r) => r.name)).toEqual([
      "曾文水庫",
      "翡翠水庫",
      "石門水庫",
      "霧社水庫",
      "阿公店水庫",
    ]);
    expect(summary.measured).toBe(5);
    expect(summary.levelOnly).toBe(2);
    expect(summary.lowest!.name).toBe("霧社水庫");
    expect(summary.above100.map((r) => r.name)).toEqual(["阿公店水庫"]);
    const storage = 388.25 + 331.6825 + 202.2702 + 10.6442 + 17.45;
    const capacity = 486.54 + 369.976 + 205.26 + 24.3342 + 14.8005;
    expect(summary.combinedStorageMcm).toBeCloseTo(storage, 3);
    expect(summary.combinedCapacityMcm).toBeCloseTo(capacity, 3);
    expect(summary.combinedPercent).toBeCloseTo((storage / capacity) * 100, 6);
    expect(summary.latest).toBe("2026-11-26T06:00:00.000Z");
  });

  it("has no combined figure when nothing qualifies", () => {
    const summary = summariseReservoirs([]);
    expect(summary.combinedPercent).toBeNull();
    expect(summary.lowest).toBeNull();
    expect(summary.latest).toBeNull();
  });

  it("names reservoirs in English where it knows them and never invents a name", () => {
    expect(reservoirLabel({ id: "10201", name: "石門水庫" }, "en")).toBe(
      "Shihmen Reservoir",
    );
    expect(reservoirLabel({ id: "10201", name: "石門水庫" }, "zh")).toBe(
      "石門水庫",
    );
    expect(reservoirLabel({ id: "50109", name: "烏溝蓄水塘" }, "en")).toBe(
      "烏溝蓄水塘",
    );
    expect(reservoirLabel({ id: "40701", name: null }, "en")).toBe("No. 40701");
  });
});

describe("the server's reservoir service", () => {
  const now = Date.parse("2026-11-26T07:00:00Z"); // 15:00 Taiwan, an hour after the newest reading
  const deps = (fail = false) => ({
    fetchJson: vi.fn(async (url: string) => {
      if (fail) throw new Error("down");
      return url.includes("2be9044c") ? status : daily;
    }),
    now: () => now,
  });

  it("joins the two feeds, marks them fresh and caches the answer", async () => {
    const d = deps();
    const service = new ReservoirService(d);
    const first = await service.get();
    expect(first.status).toBe("fresh");
    expect(first.readings).toHaveLength(7);
    expect(first.lastObservationAt).toBe("2026-11-26T06:00:00.000Z");
    await service.get();
    expect(d.fetchJson).toHaveBeenCalledTimes(2); // one call per feed, once
  });

  it("calls readings more than three hours old stale", async () => {
    const d = { ...deps(), now: () => Date.parse("2026-11-26T10:00:01Z") };
    const response = await new ReservoirService(d).get();
    expect(response.status).toBe("stale");
  });

  it("never shows a reading time in the future as current", async () => {
    const d = { ...deps(), now: () => Date.parse("2026-11-26T05:00:00Z") };
    const response = await new ReservoirService(d).get();
    expect(
      response.readings.every(
        (r) => r.observedAt <= "2026-11-26T05:05:00.000Z",
      ),
    ).toBe(true);
  });

  it("returns an honest empty answer, not a guess, when the source is down", async () => {
    const response = await new ReservoirService(deps(true)).get();
    expect(response.status).toBe("unavailable");
    expect(response.readings).toEqual([]);
  });

  it("keeps the last good readings, marked stale, when a refresh fails", async () => {
    let clock = now;
    let down = false;
    const fetchJson = vi.fn(async (url: string) => {
      if (down) throw new Error("down");
      return url.includes("2be9044c") ? status : daily;
    });
    const service = new ReservoirService({ fetchJson, now: () => clock });
    await service.get();
    down = true;
    clock += 31 * 60_000; // past the 30-minute cache
    const response = await service.get();
    expect(response.status).toBe("stale");
    expect(response.message).toBe("upstream-unavailable");
    expect(response.readings).toHaveLength(7);
  });

  it("reads a further page when a page comes back full", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({
      reservoiridentifier: String(10000 + i),
      observationtime: "2026-11-26T14:00:00",
      effectivewaterstoragecapacity: "1",
    }));
    const fetchJson = vi.fn(async (url: string) =>
      url.includes("2be9044c")
        ? url.includes("page=1&")
          ? full
          : status
        : daily,
    );
    const response = await new ReservoirService({
      fetchJson,
      now: () => now,
    }).get();
    expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    expect(response.readings.length).toBeGreaterThan(1000);
  });
});
