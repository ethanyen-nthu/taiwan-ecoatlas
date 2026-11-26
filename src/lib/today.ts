import type { DatasetResponse, Freshness } from "./types";
import { summariseAir, summariseWeather, type Extreme } from "./live-summary";
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
export interface TodaySummary {
  checkedAt: string;
  air: TodayAir;
  weather: TodayWeather;
  reservoirs: TodayReservoirs;
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
