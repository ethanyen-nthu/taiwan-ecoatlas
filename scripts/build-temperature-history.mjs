// Downloads daily mean temperature (1950-2025) for the main town of each of
// the 22 counties from Open-Meteo's Historical Weather API (ERA5-Land
// reanalysis, 0.1 degree grid) and reduces it to yearly, summer and winter
// means. Output: src/data/temperature-history.json. The site never calls
// Open-Meteo while people browse; this script is run by hand.
// Run: node scripts/build-temperature-history.mjs
// Open-Meteo: free for non-commercial use, no key, CC BY 4.0 (attribution).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const firstYear = 1950;
const lastYear = 2025;
/** A year is only used when at least this many of its days have a value. */
const minDaysPerYear = 360;

/** The main town of each county (English and Chinese name), as a latitude and longitude. The model's
 *  grid cell that holds this point is what the numbers describe. */
export const towns = {
  "09007": ["Nangan", "南竿", 26.16, 119.95],
  "09020": ["Jincheng", "金城", 24.43, 118.32],
  10002: ["Yilan", "宜蘭", 24.75, 121.75],
  10004: ["Zhubei", "竹北", 24.84, 121.01],
  10005: ["Miaoli", "苗栗", 24.56, 120.82],
  10007: ["Changhua", "彰化", 24.08, 120.54],
  10008: ["Nantou", "南投", 23.91, 120.69],
  10009: ["Douliu", "斗六", 23.71, 120.54],
  10010: ["Taibao", "太保", 23.46, 120.32],
  10013: ["Pingtung", "屏東", 22.67, 120.49],
  10014: ["Taitung", "臺東", 22.76, 121.14],
  10015: ["Hualien", "花蓮", 23.98, 121.6],
  10016: ["Magong", "馬公", 23.57, 119.58],
  10017: ["Keelung", "基隆", 25.13, 121.74],
  10018: ["Hsinchu", "新竹", 24.81, 120.97],
  10020: ["Chiayi", "嘉義", 23.48, 120.45],
  63000: ["Taipei", "臺北", 25.04, 121.56],
  64000: ["Kaohsiung", "高雄", 22.63, 120.3],
  65000: ["Banqiao", "板橋", 25.01, 121.46],
  66000: ["Taichung", "臺中", 24.15, 120.67],
  67000: ["Tainan", "臺南", 23.0, 120.21],
  68000: ["Taoyuan", "桃園", 24.99, 121.3],
};

const mean = (values) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;
const round2 = (value) => Math.round(value * 100) / 100;

/** Yearly, summer (Jun-Aug) and winter (Dec-Feb, named for the January year,
 *  so 1951 winter is Dec 1950 + Jan + Feb 1951) means from daily values. */
export function reduce(times, values) {
  const byYear = new Map();
  const put = (key, year, value) => {
    const entry = byYear.get(year) ?? { all: [], summer: [], winter: [] };
    entry[key].push(value);
    byYear.set(year, entry);
  };
  times.forEach((time, index) => {
    const value = values[index];
    if (value === null || value === undefined) return;
    const year = Number(time.slice(0, 4));
    const month = Number(time.slice(5, 7));
    put("all", year, value);
    if (month >= 6 && month <= 8) put("summer", year, value);
    if (month <= 2) put("winter", year, value);
    if (month === 12) put("winter", year + 1, value);
  });
  const out = { annual: {}, summer: {}, winter: {}, daysMissing: {} };
  for (let year = firstYear; year <= lastYear; year += 1) {
    const entry = byYear.get(year);
    const days =
      new Date(Date.UTC(year, 11, 31)) - new Date(Date.UTC(year, 0, 1));
    const expected = Math.round(days / 86400000) + 1;
    const have = entry?.all.length ?? 0;
    out.daysMissing[year] = expected - have;
    out.annual[year] = have >= minDaysPerYear ? round2(mean(entry.all)) : null;
    // Summer needs nearly all of its 92 days; winter nearly all of its ~90.
    out.summer[year] =
      entry && entry.summer.length >= 90 ? round2(mean(entry.summer)) : null;
    out.winter[year] =
      entry && entry.winter.length >= 87 && year > firstYear
        ? round2(mean(entry.winter))
        : null;
  }
  return out;
}

async function fetchTown(lat, lon) {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: `${firstYear}-01-01`,
    end_date: `${lastYear}-12-31`,
    daily: "temperature_2m_mean",
    models: "era5_land",
    timezone: "Asia/Taipei",
  });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json();
    if (response.status === 429) {
      // The hourly allowance is 5,000 calls; the reply says when it resets.
      const seconds = Number(response.headers.get("retry-after") ?? 65);
      if (seconds > 120) {
        throw new Error(`rate limited for ${seconds} s; run again then`);
      }
      console.error(`rate limited; waiting ${seconds} s`);
      await new Promise((resolve) => setTimeout(resolve, (seconds + 2) * 1000));
      continue;
    }
    throw new Error(`Open-Meteo answered ${response.status}`);
  }
  throw new Error("Open-Meteo kept refusing; try again later");
}

/** Open-Meteo counts one request for 76 years of daily data as about 200
 *  calls against a limit of 600 a minute and 5,000 an hour, so a full run
 *  takes about eight minutes. Finished towns are kept in a cache file and a
 *  run can stop on a time budget and be started again where it left off:
 *    TEMP_CACHE=/tmp/temp-cache.json TEMP_BUDGET_S=150 node scripts/... */
const pause = Number(process.env.TEMP_PAUSE_S ?? 22) * 1000;
const budget = Number(process.env.TEMP_BUDGET_S ?? 0) * 1000;
const cachePath = process.env.TEMP_CACHE ?? path.join(root, ".temp-cache.json");

async function main() {
  const started = Date.now();
  const counties = JSON.parse(
    readFileSync(path.join(root, "public/data/counties.geojson"), "utf8"),
  ).features.map((f) => f.properties);
  const cache = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, "utf8"))
    : {};
  for (const properties of counties) {
    if (cache[properties.COUNTYCODE]) continue;
    if (budget && Date.now() - started > budget) break;
    const [town, townZh, lat, lon] = towns[properties.COUNTYCODE];
    let data;
    try {
      data = await fetchTown(lat, lon);
    } catch (error) {
      console.error(String(error.message ?? error));
      break;
    }
    const reduced = reduce(data.daily.time, data.daily.temperature_2m_mean);
    cache[properties.COUNTYCODE] = {
      code: properties.COUNTYCODE,
      zh: properties.COUNTYNAME,
      en: properties.COUNTYENG,
      town,
      townZh,
      lat,
      lon,
      gridLat: data.latitude,
      gridLon: data.longitude,
      elevationM: data.elevation,
      ...reduced,
    };
    writeFileSync(cachePath, JSON.stringify(cache));
    console.error(
      properties.COUNTYNAME,
      data.elevation,
      "m",
      data.daily.time.length,
      "days",
    );
    await new Promise((resolve) => setTimeout(resolve, pause));
  }
  const done = Object.keys(cache).length;
  if (done < counties.length) {
    console.error(`incomplete: ${done} of ${counties.length}; run again`);
    process.exit(2);
  }
  const list = counties
    .map((properties) => cache[properties.COUNTYCODE])
    .sort((a, b) => a.code.localeCompare(b.code));
  const output = {
    source: "Open-Meteo Historical Weather API",
    sourceUrl: "https://open-meteo.com/en/docs/historical-weather-api",
    model:
      "ERA5-Land reanalysis (Copernicus Climate Change Service, ECMWF), 0.1 degree grid",
    variable: "Daily mean air temperature at 2 m, degrees Celsius",
    licence: "CC BY 4.0",
    fetchedAt: new Date().toISOString().slice(0, 10),
    firstYear,
    lastYear,
    minDaysPerYear,
    counties: list,
  };
  mkdirSync(path.join(root, "src/data"), { recursive: true });
  writeFileSync(
    path.join(root, "src/data/temperature-history.json"),
    `${JSON.stringify(output)}\n`,
  );
  console.error("wrote src/data/temperature-history.json");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
