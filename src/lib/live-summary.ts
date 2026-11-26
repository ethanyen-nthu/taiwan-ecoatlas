import { aqiBandOf, aqiStatusEnglish } from "./transform";
import type { Observation } from "./types";

/**
 * Plain summaries of the latest station readings. A county's figure is the
 * middle station (the median), with the range beside it, because stations are
 * unevenly spread: mountain counties have many, and a few sit on high peaks.
 * Nothing is interpolated between stations.
 */
export const normaliseCounty = (name: string | null | undefined) =>
  (name ?? "").replaceAll("台", "臺").trim();
export const inCounty = (observation: Observation, zh: string) =>
  normaliseCounty(observation.county) === normaliseCounty(zh);

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
const numbers = (list: (number | null | undefined)[]) =>
  list.filter((value): value is number => typeof value === "number");

export interface Extreme {
  value: number;
  station: string;
  county: string | null;
}
function extreme(
  observations: Observation[],
  key: string,
  pick: "max" | "min",
): Extreme | null {
  let best: Extreme | null = null;
  for (const o of observations) {
    const value = o.values[key];
    if (typeof value !== "number") continue;
    if (!best || (pick === "max" ? value > best.value : value < best.value))
      best = { value, station: o.station, county: o.county };
  }
  return best;
}

export interface WeatherSummary {
  stations: number;
  medianTemperature: number | null;
  warmest: Extreme | null;
  coolest: Extreme | null;
  medianHumidity: number | null;
  wettest: Extreme | null;
  windiest: Extreme | null;
  latest: string | null;
}
export function summariseWeather(observations: Observation[]): WeatherSummary {
  return {
    stations: observations.length,
    medianTemperature: median(
      numbers(observations.map((o) => o.values.temperature)),
    ),
    warmest: extreme(observations, "temperature", "max"),
    coolest: extreme(observations, "temperature", "min"),
    medianHumidity: median(numbers(observations.map((o) => o.values.humidity))),
    wettest: extreme(observations, "rainfall", "max"),
    windiest: extreme(observations, "windSpeed", "max"),
    latest: observations.reduce<string | null>(
      (latest, o) => (!latest || o.observedAt > latest ? o.observedAt : latest),
      null,
    ),
  };
}

export interface CountyWeather extends WeatherSummary {
  county: string;
}
/** One summary per county, in the order the counties first appear. */
export function weatherByCounty(observations: Observation[]): CountyWeather[] {
  const groups = new Map<string, Observation[]>();
  for (const o of observations) {
    const name = normaliseCounty(o.county);
    if (!name) continue;
    groups.set(name, [...(groups.get(name) ?? []), o]);
  }
  return [...groups].map(([county, list]) => ({
    county,
    ...summariseWeather(list),
  }));
}

export interface CountyAir {
  stations: number;
  reporting: number;
  medianAqi: number | null;
  band: string | null;
  bandEnglish: string | null;
  highest: { value: number; station: string } | null;
  latest: string | null;
}
export function summariseAir(observations: Observation[]): CountyAir {
  const values = numbers(observations.map((o) => o.values.aqi));
  const middle = median(values);
  const band = middle === null ? null : aqiBandOf(Math.round(middle));
  let highest: CountyAir["highest"] = null;
  for (const o of observations) {
    const value = o.values.aqi;
    if (typeof value === "number" && (!highest || value > highest.value))
      highest = { value, station: o.station };
  }
  return {
    stations: observations.length,
    reporting: values.length,
    medianAqi: middle === null ? null : Math.round(middle),
    band,
    bandEnglish: band ? (aqiStatusEnglish[band] ?? null) : null,
    highest,
    latest: observations.reduce<string | null>(
      (latest, o) => (!latest || o.observedAt > latest ? o.observedAt : latest),
      null,
    ),
  };
}
