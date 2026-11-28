import type { DatasetResponse, Freshness } from "./types";
import { countyByZh } from "./county-list";
import {
  median,
  summariseAir,
  summariseWeather,
  type Extreme,
} from "./live-summary";
import type { Observation } from "./types";
import {
  reservoirLabel,
  summariseReservoirs,
  type ReservoirResponse,
} from "./reservoirs";

/**
 * "Today": a few current figures taken from the same feeds the live pages use,
 * summarised the same way. Nothing here is stored or estimated. A part that
 * has no readings carries nulls and its status, never a zero.
 */
export interface TodayAir {
  status: Freshness;
  stations: number;
  reporting: number;
  medianAqi: number | null;
  band: string | null;
  bandEnglish: string | null;
  latest: string | null;
}
export interface TodayWeather {
  status: Freshness;
  stations: number;
  medianTemperature: number | null;
  warmest: Extreme | null;
  coolest: Extreme | null;
  /** Stations that report rain so far today, and how many of them had some. */
  rainReporting: number;
  raining: number;
  latest: string | null;
}
export interface TodayReservoirs {
  status: Freshness;
  /** Large reservoirs (10 million m³ or more) with a storage figure. */
  large: number;
  percent: number | null;
  lowest: { nameEn: string; nameZh: string; percent: number } | null;
  latest: string | null;
}
/** One county's current readings, from the middle of its own stations. A
 *  part with no station reporting is null, never a zero. */
export interface TodayCounty {
  air: {
    medianAqi: number;
    band: string | null;
    bandEnglish: string | null;
    reporting: number;
  } | null;
  weather: {
    medianTemperature: number;
    stations: number;
    coolest: number | null;
    warmest: number | null;
  } | null;
}
export interface TodaySummary {
  checkedAt: string;
  air: TodayAir;
  weather: TodayWeather;
  reservoirs: TodayReservoirs;
  /** By official county code, for the county a visitor has pinned. Absent in
   *  an older cached response. */
  counties?: Record<string, TodayCounty>;
}

/** Group station readings by official county code. Records naming no known
 *  county are left out of every county, as they are on the county pages. */
function byCode(observations: Observation[]) {
  const groups = new Map<string, Observation[]>();
  for (const observation of observations) {
    const county = countyByZh(observation.county);
    if (!county) continue;
    groups.set(county.code, [...(groups.get(county.code) ?? []), observation]);
  }
  return groups;
}

export function summariseCounties(
  air: Observation[],
  weather: Observation[],
): Record<string, TodayCounty> {
  const airBy = byCode(air);
  const weatherBy = byCode(weather);
  const result: Record<string, TodayCounty> = {};
  for (const code of new Set([...airBy.keys(), ...weatherBy.keys()])) {
    const a = summariseAir(airBy.get(code) ?? []);
    const w = summariseWeather(weatherBy.get(code) ?? []);
    const temperatures = (weatherBy.get(code) ?? [])
      .map((o) => o.values.temperature)
      .filter((value): value is number => typeof value === "number");
    const middle = median(temperatures);
    result[code] = {
      air:
        a.medianAqi === null
          ? null
          : {
              medianAqi: a.medianAqi,
              band: a.band,
              bandEnglish: a.bandEnglish,
              reporting: a.reporting,
            },
      weather:
        middle === null
          ? null
          : {
              medianTemperature: middle,
              stations: temperatures.length,
              coolest: w.coolest?.value ?? null,
              warmest: w.warmest?.value ?? null,
            },
    };
  }
  return result;
}

export function summariseToday(
  air: DatasetResponse,
  weather: DatasetResponse,
  reservoirs: ReservoirResponse,
  checkedAt: string,
): TodaySummary {
  const a = summariseAir(air.observations);
  const w = summariseWeather(weather.observations);
  const rain = weather.observations
    .map((o) => o.values.rainfall)
    .filter((value): value is number => typeof value === "number");
  const r = summariseReservoirs(reservoirs.readings);
  return {
    checkedAt,
    counties: summariseCounties(air.observations, weather.observations),
    air: {
      status: air.status,
      stations: a.stations,
      reporting: a.reporting,
      medianAqi: a.medianAqi,
      band: a.band,
      bandEnglish: a.bandEnglish,
      latest: a.latest,
    },
    weather: {
      status: weather.status,
      stations: w.stations,
      medianTemperature: w.medianTemperature,
      warmest: w.warmest,
      coolest: w.coolest,
      rainReporting: rain.length,
      raining: rain.filter((value) => value > 0).length,
      latest: w.latest,
    },
    reservoirs: {
      status: reservoirs.status,
      large: r.large.length,
      percent: r.combinedPercent,
      lowest: r.lowest
        ? {
            nameEn: reservoirLabel(r.lowest, "en"),
            nameZh: reservoirLabel(r.lowest, "zh"),
            percent: r.lowest.percent!,
          }
        : null,
      latest: r.latest,
    },
  };
}
