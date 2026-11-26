import { measurement, taiwanTime } from "./transform";
import type { Freshness, Localized } from "./types";

/**
 * Reservoir storage, from two Water Resources Agency (WRA) open datasets:
 * "水庫水情資料" (the latest storage and water level, hourly or daily) and
 * "水庫每日營運狀況" (each reservoir's name and effective capacity). The
 * percentage full is worked out here from those two, never read from either.
 */
export type ReservoirRegion =
  "north" | "central" | "south" | "east" | "islands";

/** The first two digits of a WRA reservoir number say where it is:
 *  10 north, 20 central, 30 south, 40 east, 50 offshore islands. */
const regionByPrefix: Record<string, ReservoirRegion> = {
  "10": "north",
  "20": "central",
  "30": "south",
  "40": "east",
  "50": "islands",
};
export const regionOrder: ReservoirRegion[] = [
  "north",
  "central",
  "south",
  "east",
  "islands",
];
export const regionNames: Record<ReservoirRegion, Localized> = {
  north: { en: "North", zh: "北部" },
  central: { en: "Central", zh: "中部" },
  south: { en: "South", zh: "南部" },
  east: { en: "East", zh: "東部" },
  islands: { en: "Offshore islands", zh: "離島" },
};
export const reservoirRegion = (id: string): ReservoirRegion | null =>
  regionByPrefix[id.slice(0, 2)] ?? null;

/** True when a percentage still reads above 100 after rounding to one
 *  decimal, so a reading of 100.007 is shown as 100.0% and is not flagged. */
export const exceedsCapacity = (percent: number) => percent >= 100.05;

/** A reservoir counts as large from 10 million m³ of effective capacity. */
export const largeThresholdMcm = 10;

/** One reading from the hourly/daily storage feed. */
export interface StatusRow {
  id: string;
  observedAt: string;
  /** Effective storage, in 萬 m³ (ten-thousand cubic metres), as published. */
  storageWan: number | null;
  levelM: number | null;
  catchmentRainMm: number | null;
}
/** One reservoir from the daily operations list. */
export interface DailyRow {
  id: string;
  name: string | null;
  capacityWan: number | null;
  fullLevelM: number | null;
}
export interface ReservoirReading {
  id: string;
  name: string | null;
  region: ReservoirRegion | null;
  observedAt: string;
  /** Million m³ (the feed's 萬 m³ divided by 100). */
  storageMcm: number | null;
  capacityMcm: number | null;
  /** Storage ÷ capacity × 100, unrounded and never capped. */
  percent: number | null;
  levelM: number | null;
  fullLevelM: number | null;
  /** Full level minus current level; negative when above the full level. */
  belowFullM: number | null;
  catchmentRainMm: number | null;
}
export interface ReservoirResponse {
  status: Freshness;
  readings: ReservoirReading[];
  lastObservationAt: string | null;
  retrievedAt: string | null;
  checkedAt: string;
  message: string | null;
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const lower = (item: unknown) =>
  Object.fromEntries(
    Object.entries(object(item)).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );

/** The feed answers with a bare array of rows whose values are all strings
 *  and whose gaps are empty strings; a gap stays a gap (null), never zero. */
export function parseStatusRows(payload: unknown) {
  if (!Array.isArray(payload) || !payload.length)
    throw new Error("Invalid reservoir status payload");
  const rows: StatusRow[] = [];
  let excluded = 0;
  for (const item of payload) {
    const r = lower(item);
    const id = text(r.reservoiridentifier);
    const observedAt = taiwanTime(r.observationtime);
    if (!id || !observedAt) {
      excluded++;
      continue;
    }
    rows.push({
      id,
      observedAt,
      storageWan: measurement(r.effectivewaterstoragecapacity, 0),
      levelM: measurement(r.waterlevel, -50, 4000),
      catchmentRainMm: measurement(r.accumulaterainfallincatchment, 0, 3000),
    });
  }
  if (!rows.length) throw new Error("No valid reservoir status rows");
  return { rows, excluded };
}

export function parseDailyRows(payload: unknown) {
  if (!Array.isArray(payload) || !payload.length)
    throw new Error("Invalid reservoir daily payload");
  const rows: DailyRow[] = [];
  for (const item of payload) {
    const r = lower(item);
    const id = text(r.reservoiridentifier);
    if (!id) continue;
    rows.push({
      id,
      name: text(r.reservoirname) || null,
      capacityWan: measurement(r.capacity, 0),
      // The data page labels this field's unit as 萬 m³, but the values are
      // elevations (Shihmen's is 245): they are read as metres.
      fullLevelM: measurement(r.nwlmax, -50, 4000),
    });
  }
  return rows;
}

/** For each reservoir the newest reading that carries a storage figure, or
 *  the newest reading of any kind when none does. */
export function joinReservoirs(
  status: StatusRow[],
  daily: DailyRow[],
): ReservoirReading[] {
  const byId = new Map<string, StatusRow>();
  for (const row of status) {
    const kept = byId.get(row.id);
    if (!kept) {
      byId.set(row.id, row);
      continue;
    }
    const rowHasStorage = row.storageWan !== null;
    const keptHasStorage = kept.storageWan !== null;
    if (rowHasStorage !== keptHasStorage) {
      if (rowHasStorage) byId.set(row.id, row);
    } else if (row.observedAt > kept.observedAt) {
      byId.set(row.id, row);
    }
  }
  const dailyById = new Map(daily.map((row) => [row.id, row]));
  return [...byId.values()]
    .map((row): ReservoirReading => {
      const info = dailyById.get(row.id);
      const capacity =
        info?.capacityWan && info.capacityWan > 0 ? info.capacityWan : null;
      return {
        id: row.id,
        name: info?.name ?? null,
        region: reservoirRegion(row.id),
        observedAt: row.observedAt,
        storageMcm: row.storageWan === null ? null : row.storageWan / 100,
        capacityMcm: capacity === null ? null : capacity / 100,
        percent:
          row.storageWan !== null && capacity !== null
            ? (row.storageWan / capacity) * 100
            : null,
        levelM: row.levelM,
        fullLevelM: info?.fullLevelM ?? null,
        belowFullM:
          info?.fullLevelM != null && row.levelM !== null
            ? info.fullLevelM - row.levelM
            : null,
        catchmentRainMm: row.catchmentRainMm,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export interface ReservoirSummary {
  /** Reservoirs with both a storage and a capacity figure. */
  measured: number;
  /** Reservoirs reporting a water level but no storage percentage. */
  levelOnly: number;
  total: number;
  large: ReservoirReading[];
  combinedStorageMcm: number;
  combinedCapacityMcm: number;
  combinedPercent: number | null;
  lowest: ReservoirReading | null;
  above100: ReservoirReading[];
  latest: string | null;
}

export function summariseReservoirs(
  readings: ReservoirReading[],
): ReservoirSummary {
  const measured = readings.filter((r) => r.percent !== null);
  const large = measured
    .filter((r) => (r.capacityMcm ?? 0) >= largeThresholdMcm)
    .sort((a, b) => b.capacityMcm! - a.capacityMcm!);
  const storage = large.reduce((sum, r) => sum + r.storageMcm!, 0);
  const capacity = large.reduce((sum, r) => sum + r.capacityMcm!, 0);
  const lowest = large.length
    ? large.reduce((low, r) => (r.percent! < low.percent! ? r : low))
    : null;
  return {
    measured: measured.length,
    levelOnly: readings.filter((r) => r.percent === null && r.levelM !== null)
      .length,
    total: readings.length,
    large,
    combinedStorageMcm: storage,
    combinedCapacityMcm: capacity,
    combinedPercent: capacity > 0 ? (storage / capacity) * 100 : null,
    lowest,
    above100: measured.filter((r) => exceedsCapacity(r.percent!)),
    latest: readings.reduce<string | null>(
      (latest, r) => (!latest || r.observedAt > latest ? r.observedAt : latest),
      null,
    ),
  };
}

/** English names for the larger reservoirs; the rest keep the name as published. */
const englishNames: Record<string, string> = {
  石門水庫: "Shihmen Reservoir",
  翡翠水庫: "Feitsui Reservoir",
  曾文水庫: "Tsengwen Reservoir",
  德基水庫: "Techi Reservoir",
  日月潭水庫: "Sun Moon Lake",
  鯉魚潭水庫: "Liyutan Reservoir",
  南化水庫: "Nanhua Reservoir",
  烏山頭水庫: "Wushantou Reservoir",
  湖山水庫: "Hushan Reservoir",
  寶山第二水庫: "Baoshan No. 2 Reservoir",
  永和山水庫: "Yonghoshan Reservoir",
  牡丹水庫: "Mudan Reservoir",
  仁義潭水庫: "Renyitan Reservoir",
  霧社水庫: "Wushe Reservoir",
  阿公店水庫: "Agongdian Reservoir",
};
export function reservoirLabel(
  reading: Pick<ReservoirReading, "id" | "name">,
  language: "en" | "zh",
) {
  if (!reading.name)
    return language === "en" ? `No. ${reading.id}` : reading.id;
  return language === "en"
    ? (englishNames[reading.name] ?? reading.name)
    : reading.name;
}
