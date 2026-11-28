import type { Freshness, Language, Localized } from "./types";

/**
 * Live hazards from the Central Weather Administration's open data: felt
 * earthquakes (E-A0015-001 significant, E-A0016-001 small-area) and tropical
 * cyclone tracks (W-C0034-005).
 *
 * The parsers read each field by name, ignoring case and punctuation, because
 * the agency has published both camelCase and PascalCase layouts of these
 * datasets. A record that cannot be read in full is left out and counted; it
 * is never repaired or guessed. A payload that has no recognisable container
 * at all is an error, not an empty list, so the site never says "no typhoon"
 * because it could not read the feed.
 */

// ---------------------------------------------------------------- reading --

const squash = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** The value under the first of `names` that the object has, ignoring case. */
export function field(source: unknown, ...names: string[]): unknown {
  if (!isObject(source)) return undefined;
  const wanted = new Set(names.map(squash));
  for (const [key, value] of Object.entries(source))
    if (wanted.has(squash(key))) return value;
  return undefined;
}
/** A records block that carries nothing but its description (or nothing). */
const metadataKeys = new Set([
  "datasetdescription",
  "dataid",
  "datasetid",
  "note",
  "notes",
  "description",
]);
const hasOnlyDescription = (records: Record<string, unknown>) =>
  Object.keys(records).every((key) => metadataKeys.has(squash(key)));
const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
export function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  // { unit: "...", value: 4 } as some CWA fields are shaped.
  if (isObject(value)) return num(field(value, "value"));
  return null;
}
const text = (value: unknown): string | null => {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
};

/** CWA writes local (Taipei) times, often without an offset. */
export function taipeiTime(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
  const iso = raw.replace(" ", "T") + (hasOffset ? "" : "+08:00");
  const time = Date.parse(iso);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

// -------------------------------------------------------------- earthquakes --

/** Taiwan's seismic intensity (震度) runs 0–7, with weak and strong steps at 5
 *  and 6. `rank` puts them in order: 5 weak = 5, 5 strong = 5.5, 6 weak = 6. */
export interface Intensity {
  label: string;
  rank: number;
}
export function parseIntensity(value: unknown): Intensity | null {
  const raw = isObject(value) ? field(value, "value") : value;
  if (raw == null) return null;
  const label = String(raw).trim().replace(/級$/, "");
  const match = /^([0-7])\s*(弱|強|强|-|\+|weak|strong)?$/i.exec(label);
  if (!match) return null;
  const base = Number(match[1]);
  const step = (match[2] ?? "").toLowerCase();
  const strong = ["強", "强", "+", "strong"].includes(step);
  const weak = ["弱", "-", "weak"].includes(step);
  if ((strong || weak) && (base < 5 || base > 6)) return null;
  const normal = `${base}${weak ? "弱" : strong ? "強" : ""}`;
  return { label: normal, rank: base + (strong ? 0.5 : 0) };
}
export function intensityText(intensity: Intensity, language: Language) {
  if (language === "zh") return `${intensity.label}級`;
  return intensity.label.replace("弱", " weak").replace("強", " strong");
}
export type IntensityBand = "1-2" | "3" | "4" | "5" | "6-7" | "unknown";
export function intensityBand(intensity: Intensity | null): IntensityBand {
  if (!intensity) return "unknown";
  if (intensity.rank < 3) return "1-2";
  if (intensity.rank < 4) return "3";
  if (intensity.rank < 5) return "4";
  if (intensity.rank < 6) return "5";
  return "6-7";
}
/** A single warm-to-dark ramp: light for barely felt, near-black red for the
 *  strongest shaking. Unknown intensity is grey and never sits on the ramp. */
export const intensityColours: Record<IntensityBand, string> = {
  "1-2": "#f2d58f",
  "3": "#e8a13a",
  "4": "#d4622a",
  "5": "#b02a2e",
  "6-7": "#66143a",
  unknown: "#8d969e",
};
export const intensityBandLabels: Record<IntensityBand, Localized> = {
  "1-2": { en: "Intensity 1–2", zh: "震度 1–2 級" },
  "3": { en: "Intensity 3", zh: "震度 3 級" },
  "4": { en: "Intensity 4", zh: "震度 4 級" },
  "5": { en: "Intensity 5", zh: "震度 5 級" },
  "6-7": { en: "Intensity 6–7", zh: "震度 6–7 級" },
  unknown: { en: "Intensity not reported", zh: "未提供震度" },
};

export interface ShakingArea {
  /** County or city name as CWA writes it (Chinese). */
  county: string;
  intensity: Intensity;
}
export interface Earthquake {
  id: string;
  feed: "significant" | "local";
  number: string | null;
  originTime: string;
  latitude: number;
  longitude: number;
  depthKm: number | null;
  magnitude: number | null;
  magnitudeType: string | null;
  /** CWA's own description of where it happened (Chinese). */
  locationZh: string | null;
  maxIntensity: Intensity | null;
  areas: ShakingArea[];
  summaryZh: string | null;
  reportUrl: string | null;
}

const withinTaiwanRegion = (lat: number, lon: number) =>
  lat >= 5 && lat <= 35 && lon >= 100 && lon <= 135;

export function parseEarthquake(
  record: unknown,
  feed: Earthquake["feed"],
): Earthquake | null {
  const info = field(record, "earthquakeInfo");
  const originTime = taipeiTime(field(info, "originTime"));
  const epicentre = field(info, "epiCenter", "epicenter");
  const latitude = num(
    field(
      epicentre,
      "epiCenterLat",
      "epicenterLatitude",
      "epiCenterLatitude",
      "latitude",
      "lat",
    ),
  );
  const longitude = num(
    field(
      epicentre,
      "epiCenterLon",
      "epicenterLongitude",
      "epiCenterLongitude",
      "longitude",
      "lon",
    ),
  );
  if (!originTime || latitude === null || longitude === null) return null;
  if (!withinTaiwanRegion(latitude, longitude)) return null;
  const magnitudeBlock = field(info, "magnitude", "earthquakeMagnitude");
  const magnitude = num(field(magnitudeBlock, "magnitudeValue", "value"));
  // The feed repeats a county once per township and adds summary rows that
  // name several counties at once ("花蓮縣、宜蘭縣"), so each name is split,
  // and a county keeps the strongest intensity reported for it.
  const byCounty = new Map<string, ShakingArea>();
  const shaking = field(field(record, "intensity"), "shakingArea");
  for (const area of asList(shaking)) {
    const names = text(field(area, "countyName", "areaName"));
    const intensity = parseIntensity(field(area, "areaIntensity"));
    if (!names || !intensity) continue;
    for (const county of names.split(/[、,，；;]/).map((part) => part.trim())) {
      if (!county) continue;
      const known = byCounty.get(county);
      if (!known || known.intensity.rank < intensity.rank)
        byCounty.set(county, { county, intensity });
    }
  }
  const areas = [...byCounty.values()].sort(
    (a, b) => b.intensity.rank - a.intensity.rank,
  );
  const number = text(field(record, "earthquakeNo"));
  const web = text(field(record, "web"));
  const depth = num(field(info, "focalDepth"));
  return {
    // The small-area feed numbers every report the same, so the time is part
    // of the identity.
    id: `${feed}-${number ?? "n"}-${Math.floor(Date.parse(originTime) / 1000)}`,
    feed,
    number,
    originTime,
    latitude,
    longitude,
    depthKm: depth !== null && depth >= 0 ? depth : null,
    magnitude: magnitude !== null && magnitude >= 0 ? magnitude : null,
    magnitudeType: text(field(magnitudeBlock, "magnitudeType")),
    locationZh:
      text(field(epicentre, "location"))?.replace(/\s+/g, " ") ?? null,
    maxIntensity: areas[0]?.intensity ?? null,
    areas,
    summaryZh:
      (text(field(record, "reportContent")) ?? "").slice(0, 400) || null,
    reportUrl: web && /^https:\/\//.test(web) ? web : null,
  };
}

export interface FeedRead<T> {
  items: T[];
  /** Records present in the payload that could not be read in full. */
  excluded: number;
}
/** Every earthquake record in a CWA earthquake payload. Throws when the
 *  payload has no records container at all. */
export function parseEarthquakes(
  payload: unknown,
  feed: Earthquake["feed"],
): FeedRead<Earthquake> {
  const records = field(payload, "records");
  if (!isObject(records)) throw new Error("No records container");
  const container = field(records, "earthquake");
  // A feed with nothing to report may omit the list or leave it empty, but a
  // payload with other contents and no list is a layout this code does not know.
  if (container === undefined && !hasOnlyDescription(records))
    throw new Error("Records container has no earthquake list");
  const rows = asList(container);
  const items: Earthquake[] = [];
  let excluded = 0;
  for (const row of rows) {
    const read = parseEarthquake(row, feed);
    if (read) items.push(read);
    else excluded++;
  }
  return { items, excluded };
}

/** The same earthquake can be in both feeds. Keep one, preferring the
 *  significant-earthquake report, and order newest first. */
export function mergeEarthquakes(lists: Earthquake[][]): Earthquake[] {
  const all = lists
    .flat()
    .sort((a, b) =>
      a.feed === b.feed ? 0 : a.feed === "significant" ? -1 : 1,
    );
  const kept: Earthquake[] = [];
  for (const quake of all) {
    const duplicate = kept.some(
      (other) =>
        Math.abs(Date.parse(other.originTime) - Date.parse(quake.originTime)) <=
          120_000 &&
        Math.abs(other.latitude - quake.latitude) <= 0.25 &&
        Math.abs(other.longitude - quake.longitude) <= 0.25,
    );
    if (!duplicate) kept.push(quake);
  }
  return kept.sort((a, b) => b.originTime.localeCompare(a.originTime));
}

// ---------------------------------------------------------------- typhoons --

export interface Fix {
  time: string | null;
  /** Hours ahead of the analysis time for a forecast fix; null for analysis. */
  tauHours: number | null;
  latitude: number;
  longitude: number;
  maxWindMs: number | null;
  gustMs: number | null;
  pressureHpa: number | null;
  speedKmh: number | null;
  direction: string | null;
  /** Radius where wind is at least 15 m/s (Beaufort 7), km. */
  radius15: number | null;
  radius15Quadrants: Quadrants | null;
  /** Radius where wind is at least 25 m/s (storm force), km. */
  radius25: number | null;
  /** Forecast only: the circle the centre stays inside with 70% probability. */
  radius70: number | null;
}
export type Quadrants = { NE: number; SE: number; SW: number; NW: number };
export interface Cyclone {
  id: string;
  nameEn: string | null;
  nameZh: string | null;
  number: string | null;
  past: Fix[];
  current: Fix | null;
  forecast: Fix[];
}

/** "lon,lat" as CWA writes it; the longitude is the value of 90 or more. */
export function parseCoordinate(
  value: unknown,
): { latitude: number; longitude: number } | null {
  const raw = Array.isArray(value) ? value.join(",") : text(value);
  if (!raw) return null;
  const parts = raw
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const [a, b] = parts;
  const longitude = a >= 90 ? a : b >= 90 ? b : null;
  const latitude = a >= 90 ? b : b >= 90 ? a : null;
  if (longitude === null || latitude === null) return null;
  if (latitude < -10 || latitude > 60 || longitude > 200) return null;
  return { latitude, longitude };
}

/** The four quadrant radii of a wind circle. CWA has written them as a list of
 *  {direction, radius} items, as items nested one level deeper, and as one
 *  value per compass name, so each is read; anything else gives none rather
 *  than a guess, and the circle's single radius is still shown. */
function readQuadrants(circle: unknown): Quadrants | null {
  const found: Partial<Quadrants> = {};
  const accept = (dir: unknown, value: unknown) => {
    const name = text(dir)?.toUpperCase();
    const radius = num(value);
    if (
      (name === "NE" || name === "SE" || name === "SW" || name === "NW") &&
      radius !== null &&
      radius >= 0
    )
      found[name] = radius;
  };
  const walk = (node: unknown, depth: number) => {
    if (depth > 4) return;
    for (const item of asList(node)) {
      if (!isObject(item)) continue;
      for (const name of ["NE", "SE", "SW", "NW"])
        accept(name, field(item, name));
      accept(
        field(item, "dir", "direction", "quadrant", "name"),
        field(item, "radius", "value"),
      );
      for (const value of Object.values(item))
        if (isObject(value) || Array.isArray(value)) walk(value, depth + 1);
    }
  };
  walk(
    field(circle, "quadrantRadii", "quadrantRadius", "quadrant", "quadrants"),
    0,
  );
  return found.NE !== undefined &&
    found.SE !== undefined &&
    found.SW !== undefined &&
    found.NW !== undefined
    ? (found as Quadrants)
    : null;
}

function readFix(raw: unknown, forecast: boolean): Fix | null {
  // One "lon,lat" string, or a longitude and a latitude field of their own.
  const longitude = num(field(raw, "coordinateLongitude", "longitude", "lon"));
  const latitude = num(field(raw, "coordinateLatitude", "latitude", "lat"));
  const position =
    parseCoordinate(field(raw, "coordinate")) ??
    (longitude !== null &&
    latitude !== null &&
    longitude >= 90 &&
    longitude <= 200 &&
    latitude >= -10 &&
    latitude <= 60
      ? { latitude, longitude }
      : null);
  if (!position) return null;
  const circle15 = field(raw, "circleOf15Ms", "circle15ms");
  const circle25 = field(raw, "circleOf25Ms", "circle25ms");
  const radius = (circle: unknown) => {
    const value = num(field(circle, "radius"));
    return value !== null && value >= 0 ? value : null;
  };
  const tau = forecast ? num(field(raw, "tau", "forecastHour")) : null;
  const initTime = taipeiTime(field(raw, "initTime", "initialTime"));
  const fixTime = taipeiTime(field(raw, "fixTime", "dateTime"));
  const time =
    fixTime ??
    (initTime && tau !== null
      ? new Date(Date.parse(initTime) + tau * 3600_000).toISOString()
      : initTime);
  const wind = num(field(raw, "maxWindSpeed"));
  const pressure = num(field(raw, "pressure"));
  return {
    time,
    tauHours: tau,
    ...position,
    maxWindMs: wind !== null && wind >= 0 ? wind : null,
    gustMs: num(field(raw, "maxGustSpeed")),
    pressureHpa: pressure !== null && pressure > 800 ? pressure : null,
    speedKmh: num(field(raw, "movingSpeed")),
    direction: text(field(raw, "movingDirection")),
    radius15: radius(circle15),
    radius15Quadrants: readQuadrants(circle15),
    radius25: radius(circle25),
    radius70: (() => {
      const value = num(
        field(
          raw,
          "radiusOf70PercentProbability",
          "radius70PercentProbability",
        ),
      );
      return value !== null && value >= 0 ? value : null;
    })(),
  };
}

export function parseCyclone(record: unknown): Cyclone | null {
  const analysis = field(field(record, "analysisData"), "fix");
  const past = asList(analysis)
    .map((fix) => readFix(fix, false))
    .filter((fix): fix is Fix => !!fix)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const forecast = asList(field(field(record, "forecastData"), "fix"))
    .map((fix) => readFix(fix, true))
    .filter((fix): fix is Fix => !!fix)
    .sort((a, b) => (a.tauHours ?? 0) - (b.tauHours ?? 0));
  if (!past.length) return null;
  const nameEn = text(field(record, "typhoonName"));
  const nameZh = text(field(record, "cwaTyphoonName"));
  const number =
    text(field(record, "cwaTyNo")) ?? text(field(record, "cwaTdNo"));
  return {
    id: number ?? nameEn ?? nameZh ?? past[0].time ?? "cyclone",
    nameEn,
    nameZh,
    number,
    past,
    current: past[past.length - 1],
    forecast,
  };
}

export function parseCyclones(payload: unknown): FeedRead<Cyclone> {
  const records = field(payload, "records");
  if (!isObject(records)) throw new Error("No records container");
  const holder = field(records, "tropicalCyclones");
  // No active cyclone: the holder is empty, null or its list is empty, or the
  // records hold nothing but their description.
  if (holder === undefined) {
    if (hasOnlyDescription(records)) return { items: [], excluded: 0 };
    throw new Error("Records container has no tropical cyclone holder");
  }
  const rows = asList(
    isObject(holder) ? field(holder, "tropicalCyclone") : holder,
  );
  const items: Cyclone[] = [];
  let excluded = 0;
  for (const row of rows) {
    const read = parseCyclone(row);
    if (read) items.push(read);
    else excluded++;
  }
  return { items, excluded };
}

/** CWA's classes by maximum sustained wind (m/s). */
export type CycloneClass = "depression" | "mild" | "moderate" | "intense";
export function cycloneClass(maxWindMs: number | null): CycloneClass | null {
  if (maxWindMs === null) return null;
  if (maxWindMs < 17.2) return "depression";
  if (maxWindMs < 32.7) return "mild";
  if (maxWindMs < 51) return "moderate";
  return "intense";
}
export const cycloneClassLabels: Record<CycloneClass, Localized> = {
  depression: { en: "Tropical depression", zh: "熱帶性低氣壓" },
  mild: { en: "Mild typhoon", zh: "輕度颱風" },
  moderate: { en: "Moderate typhoon", zh: "中度颱風" },
  intense: { en: "Intense typhoon", zh: "強烈颱風" },
};
export function cycloneName(cyclone: Cyclone, language: Language) {
  const en = cyclone.nameEn && cyclone.nameEn !== "-" ? cyclone.nameEn : null;
  const zh = cyclone.nameZh;
  const base = language === "zh" ? (zh ?? en) : (en ?? zh);
  return base ?? (language === "zh" ? "熱帶性低氣壓" : "Tropical depression");
}

// ------------------------------------------------------------- the response --

export type HazardFeedState =
  "ok" | "unreadable" | "unavailable" | "not-configured";
export interface EarthquakeSection {
  status: Freshness;
  events: Earthquake[];
  feeds: { significant: HazardFeedState; local: HazardFeedState };
  excluded: number;
  retrievedAt: string | null;
  message: string | null;
}
export interface TyphoonSection {
  status: Freshness;
  cyclones: Cyclone[];
  feed: HazardFeedState;
  excluded: number;
  retrievedAt: string | null;
  message: string | null;
}
export interface HazardsResponse {
  checkedAt: string;
  earthquakes: EarthquakeSection;
  typhoon: TyphoonSection;
}

// ---------------------------------------------------------------- geometry --

const R = 6371.0088;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;
/** The point `km` from here along `bearing` degrees clockwise from north. */
export function destination(
  longitude: number,
  latitude: number,
  km: number,
  bearing: number,
): [number, number] {
  const d = km / R,
    b = rad(bearing),
    lat1 = rad(latitude),
    lon1 = rad(longitude);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [deg(lon2), deg(lat2)];
}
/** A closed ring around a point; the first and last positions are the same. */
export function circleRing(
  longitude: number,
  latitude: number,
  km: number,
  steps = 72,
): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++)
    ring.push(destination(longitude, latitude, km, (360 * i) / steps));
  ring.push(ring[0]);
  return ring;
}
/** A ring whose radius is set separately in each compass quadrant, as CWA
 *  publishes wind radii. The edges between quadrants are straight steps. */
export function quadrantRing(
  longitude: number,
  latitude: number,
  radii: Quadrants,
  stepsPerQuadrant = 18,
): [number, number][] {
  const order: [keyof Quadrants, number][] = [
    ["NE", 0],
    ["SE", 90],
    ["SW", 180],
    ["NW", 270],
  ];
  const ring: [number, number][] = [];
  for (const [name, start] of order)
    for (let i = 0; i <= stepsPerQuadrant; i++)
      ring.push(
        destination(
          longitude,
          latitude,
          radii[name],
          start + (90 * i) / stepsPerQuadrant,
        ),
      );
  ring.push(ring[0]);
  return ring;
}

// ------------------------------------------------------------------- words --

/** "12 min ago", "3 h ago", "2 days ago", or the zh equivalents. */
export function ageWords(
  iso: string,
  now: number,
  language: Language,
): string | null {
  const time = Date.parse(iso);
  if (!Number.isFinite(time) || time > now + 5 * 60_000) return null;
  const minutes = Math.max(0, Math.round((now - time) / 60_000));
  if (minutes < 1) return language === "en" ? "just now" : "剛剛";
  if (minutes < 60)
    return language === "en" ? `${minutes} min ago` : `${minutes} 分鐘前`;
  const hours = Math.round(minutes / 60);
  if (hours < 48)
    return language === "en" ? `${hours} h ago` : `${hours} 小時前`;
  const days = Math.round(hours / 24);
  return language === "en" ? `${days} days ago` : `${days} 天前`;
}

/** Windows that decide what the Today strip says. */
export const quakeShownForDays = 7;
export function latestFeltQuake(
  events: Earthquake[],
  now: number,
): Earthquake | null {
  const limit = now - quakeShownForDays * 86_400_000;
  const recent = events.find(
    (event) =>
      Date.parse(event.originTime) >= limit &&
      Date.parse(event.originTime) <= now + 5 * 60_000,
  );
  return recent ?? null;
}

// ------------------------------------------------------------- counties --

const countyNames: Record<string, string> = {
  臺北市: "Taipei City",
  新北市: "New Taipei City",
  桃園市: "Taoyuan City",
  臺中市: "Taichung City",
  臺南市: "Tainan City",
  高雄市: "Kaohsiung City",
  基隆市: "Keelung City",
  新竹市: "Hsinchu City",
  嘉義市: "Chiayi City",
  新竹縣: "Hsinchu County",
  苗栗縣: "Miaoli County",
  彰化縣: "Changhua County",
  南投縣: "Nantou County",
  雲林縣: "Yunlin County",
  嘉義縣: "Chiayi County",
  屏東縣: "Pingtung County",
  宜蘭縣: "Yilan County",
  花蓮縣: "Hualien County",
  臺東縣: "Taitung County",
  澎湖縣: "Penghu County",
  金門縣: "Kinmen County",
  連江縣: "Lienchiang County",
};
/** The county in the reader's language. CWA writes 臺; a name this table does
 *  not know is shown as the agency wrote it, never translated by guess. */
export function countyName(name: string, language: Language): string {
  if (language === "zh") return name;
  return countyNames[name.replace(/台/g, "臺")] ?? name;
}

// ------------------------------------------------------------- the words --

const dayWords = (iso: string, language: Language) =>
  language === "en"
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Taipei",
        day: "numeric",
        month: "short",
      }).format(new Date(iso))
    : new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        month: "numeric",
        day: "numeric",
      }).format(new Date(iso));

/** The cyclone with the strongest wind first. */
export function byStrength(cyclones: Cyclone[]): Cyclone[] {
  return [...cyclones].sort(
    (a, b) => (b.current?.maxWindMs ?? -1) - (a.current?.maxWindMs ?? -1),
  );
}

const keyMissing = (en: boolean) =>
  en
    ? "Needs the agency key to be set up (see Sources)."
    : "需要設定氣象署金鑰（見來源頁）。";
const feedDown = (message: string | null, en: boolean) =>
  message === "unreadable-payload"
    ? en
      ? "The agency’s reply could not be read, so nothing is drawn."
      : "無法讀取氣象署的回應，因此圖上沒有資料。"
    : en
      ? "The agency’s feed is not answering, so nothing is drawn."
      : "氣象署資料目前沒有回應，因此圖上沒有資料。";
const lastReading = (en: boolean) =>
  en
    ? " The feed is not answering; this is the last reading."
    : "資料目前沒有回應，這是最後一次的讀數。";

/** One plain sentence under the earthquake layer's switch. It states what the
 *  agency's feed holds, so an empty list reads as "none reported" and a feed
 *  that is down reads as down, never as quiet. */
export function earthquakeLine(
  section: EarthquakeSection | undefined,
  now: number,
  language: Language,
): string | null {
  if (!section) return null;
  const en = language === "en";
  if (section.status === "not-configured") return keyMissing(en);
  if (section.status === "unavailable") return feedDown(section.message, en);
  const events = section.events;
  const note = section.status === "stale" ? lastReading(en) : "";
  if (!events.length)
    return en
      ? `The agency’s current reports list no felt earthquakes.${note}`
      : `氣象署目前的報告中沒有有感地震。${note}`;
  const newest = ageWords(events[0].originTime, now, language);
  const since = dayWords(events[events.length - 1].originTime, language);
  return en
    ? `${events.length} felt ${events.length === 1 ? "earthquake" : "earthquakes"} in the agency’s recent reports, the newest ${newest ?? "just now"}; the oldest is from ${since}.${note}`
    : `氣象署近期報告中有 ${events.length} 筆有感地震，最新一筆${newest ?? "剛剛"}；最早的是 ${since}。${note}`;
}

export function typhoonLine(
  section: TyphoonSection | undefined,
  now: number,
  language: Language,
): string | null {
  if (!section) return null;
  const en = language === "en";
  if (section.status === "not-configured") return keyMissing(en);
  if (section.status === "unavailable") return feedDown(section.message, en);
  const note = section.status === "stale" ? lastReading(en) : "";
  if (!section.cyclones.length)
    return en
      ? `No tropical cyclone is being tracked right now.${note}`
      : `目前沒有受追蹤的熱帶氣旋。${note}`;
  const ordered = byStrength(section.cyclones);
  if (ordered.length > 1) {
    const names = ordered.map((c) => cycloneName(c, language));
    return en
      ? `${ordered.length} tropical cyclones are being tracked: ${names.join(", ")}.${note}`
      : `目前追蹤 ${ordered.length} 個熱帶氣旋：${names.join("、")}。${note}`;
  }
  const [only] = ordered;
  const klass = cycloneClass(only.current?.maxWindMs ?? null);
  const label = klass ? cycloneClassLabels[klass][language] : null;
  const age = only.current?.time
    ? ageWords(only.current.time, now, language)
    : null;
  const name = cycloneName(only, language);
  return en
    ? `${name}${label ? `, ${label.toLowerCase()}` : ""}${age ? `; position analysed ${age}` : ""}.${note}`
    : `${name}${label ? `，${label}` : ""}${age ? `；位置分析於${age}` : ""}。${note}`;
}
