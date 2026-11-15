import { validCoordinate } from "./geo";
import type { Observation } from "./types";
export function measurement(
  value: unknown,
  min = 0,
  max = Infinity,
): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  )
    return null;
  if (
    typeof value === "string" &&
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
export function taiwanTime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let text = value.trim().replaceAll("/", "-").replace(" ", "T");
  const parts = text.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$/i,
  );
  if (!parts) return null;
  const [, y, m, d, h, minute, second, zone] = parts;
  const year = Number(y),
    month = Number(m),
    day = Number(d);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1] ||
    Number(h) > 23 ||
    Number(minute) > 59 ||
    Number(second || 0) > 59
  )
    return null;
  if (zone && zone.toUpperCase() !== "Z") {
    const offset = zone.slice(1).replace(":", "");
    const hours = Number(offset.slice(0, 2)),
      minutes = Number(offset.slice(2));
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0))
      return null;
  }
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) text += "+08:00";
  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export function parseAqi(payload: unknown) {
  const records = Array.isArray(payload) ? payload : object(payload).records;
  if (!Array.isArray(records) || !records.length)
    throw new Error("Invalid AQI payload");
  const rows: Observation[] = [];
  let excluded = 0;
  for (const item of records) {
    const r = Object.fromEntries(
      Object.entries(object(item)).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const longitude = measurement(r.longitude, -180, 180),
      latitude = measurement(r.latitude, -90, 90);
    const observedAt = taiwanTime(r.publishtime);
    if (
      !validCoordinate(longitude, latitude) ||
      !observedAt ||
      !str(r.siteid) ||
      !str(r.sitename)
    ) {
      excluded++;
      continue;
    }
    rows.push({
      id: str(r.siteid),
      source: "aqi",
      station: str(r.sitename),
      county: str(r.county) || null,
      longitude: longitude!,
      latitude: latitude!,
      observedAt,
      publishedAt: observedAt,
      status: str(r.status) || null,
      values: {
        aqi: measurement(r.aqi),
        pm25: measurement(r["pm2.5"]),
        pm10: measurement(r.pm10),
        o3: measurement(r.o3),
        no2: measurement(r.no2),
        so2: measurement(r.so2),
        co: measurement(r.co),
      },
    });
  }
  return normalize(rows, excluded);
}
export function parseWeather(payload: unknown, dataset = "O-A0003-001") {
  const records = object(payload).records;
  const stations = object(records).Station;
  if (!Array.isArray(stations) || !stations.length)
    throw new Error("Invalid weather payload");
  const rows: Observation[] = [];
  let excluded = 0;
  for (const item of stations) {
    const r = object(item),
      geo = object(r.GeoInfo),
      weather = object(r.WeatherElement);
    const coordinates = Array.isArray(geo.Coordinates) ? geo.Coordinates : [];
    const coord = object(
      coordinates.find(
        (c) => str(object(c).CoordinateName).toUpperCase() === "WGS84",
      ),
    );
    const longitude = measurement(coord.StationLongitude, -180, 180),
      latitude = measurement(coord.StationLatitude, -90, 90);
    const observedAt = taiwanTime(object(r.ObsTime).DateTime);
    if (
      !validCoordinate(longitude, latitude) ||
      !observedAt ||
      !str(r.StationId) ||
      !str(r.StationName)
    ) {
      excluded++;
      continue;
    }
    rows.push({
      id: str(r.StationId),
      source: dataset,
      station: str(r.StationName),
      county: str(geo.CountyName) || null,
      longitude: longitude!,
      latitude: latitude!,
      observedAt,
      publishedAt: null,
      status: null,
      values: {
        temperature: measurement(weather.AirTemperature, -50, 60),
        rainfall: measurement(object(weather.Now).Precipitation),
        humidity: measurement(weather.RelativeHumidity, 0, 100),
        windSpeed: measurement(weather.WindSpeed),
        windDirection: measurement(weather.WindDirection, 0, 360),
      },
    });
  }
  return normalize(rows, excluded);
}
export function normalize(rows: Observation[], excluded = 0) {
  const unique = new Map<string, Observation>();
  let duplicates = 0;
  for (const row of rows) {
    const previous = unique.get(row.id);
    if (previous) duplicates++;
    if (!previous || row.observedAt > previous.observedAt)
      unique.set(row.id, row);
  }
  if (!unique.size) throw new Error("No valid station observations");
  return { observations: [...unique.values()], excluded, duplicates };
}
// MOENV official category swatches: airtw.moenv.gov.tw/css/git_articlesFix.css
// .tb2 .air{green,yellow,orange,red,purple,brown} div:before
export const aqiColours: Record<string, string> = {
  良好: "#009865",
  普通: "#fffb26",
  對敏感族群不健康: "#ff9835",
  對所有族群不健康: "#ca0034",
  非常不健康: "#670099",
  危害: "#7e0123",
};
export const aqiStatusEnglish: Record<string, string> = {
  良好: "Good",
  普通: "Moderate",
  對敏感族群不健康: "Unhealthy for sensitive groups",
  對所有族群不健康: "Unhealthy",
  非常不健康: "Very unhealthy",
  危害: "Hazardous",
};
export function aqiColor(status: string | null) {
  return aqiColours[status || ""] || "#7c868d";
}
