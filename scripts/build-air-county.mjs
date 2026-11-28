// Reduces the Ministry of Environment's "air pollutant concentrations" table
// (data.gov.tw dataset 89030, open-data table stat_p_116) to one PM2.5 annual
// average per county and year. The table gives national and county figures
// from the ministry's general automatic monitoring stations; it holds the
// latest five years, so that is all this file can show.
// The site never calls the ministry while people browse; this is run by hand.
// Run: MOENV_API_KEY=... node scripts/build-air-county.mjs
//  or: node scripts/build-air-county.mjs --from saved-rows.json
// Output: src/data/air-county.json
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** County name as the ministry writes it, to the official county code. */
export const counties = {
  臺北市: ["63000", "Taipei City"],
  新北市: ["65000", "New Taipei City"],
  桃園市: ["68000", "Taoyuan City"],
  臺中市: ["66000", "Taichung City"],
  臺南市: ["67000", "Tainan City"],
  高雄市: ["64000", "Kaohsiung City"],
  基隆市: ["10017", "Keelung City"],
  新竹市: ["10018", "Hsinchu City"],
  新竹縣: ["10004", "Hsinchu County"],
  苗栗縣: ["10005", "Miaoli County"],
  彰化縣: ["10007", "Changhua County"],
  南投縣: ["10008", "Nantou County"],
  雲林縣: ["10009", "Yunlin County"],
  嘉義市: ["10020", "Chiayi City"],
  嘉義縣: ["10010", "Chiayi County"],
  屏東縣: ["10013", "Pingtung County"],
  宜蘭縣: ["10002", "Yilan County"],
  花蓮縣: ["10015", "Hualien County"],
  臺東縣: ["10014", "Taitung County"],
  澎湖縣: ["10016", "Penghu County"],
  金門縣: ["09020", "Kinmen County"],
  連江縣: ["09007", "Lienchiang County"],
};

/** Whole-year rows ("110年") from the table, as {name, year, pm25}. A period
 *  with a month in it ("110年 8月") is skipped, and so is any value that is
 *  not a plain number: a gap stays a gap. Years are Republic of China years
 *  plus 1911. */
export function reduceRows(rows) {
  const out = [];
  for (const row of rows) {
    const match = /^(\d+)年$/.exec(String(row.item1).trim());
    if (!match) continue;
    const text = String(row.value2).trim();
    out.push({
      name: String(row.item2).trim(),
      year: Number(match[1]) + 1911,
      pm25: /^\d+(\.\d+)?$/.test(text) ? Number(text) : null,
    });
  }
  return out;
}

export function build(rows, fetchedAt) {
  const annual = reduceRows(rows);
  const years = [...new Set(annual.map((row) => row.year))].sort();
  const valueOf = (name, year) =>
    annual.find((row) => row.name === name && row.year === year)?.pm25 ?? null;
  const series = (name) =>
    Object.fromEntries(years.map((year) => [year, valueOf(name, year)]));
  return {
    source:
      "Ministry of Environment, air pollutant concentrations by county (data.gov.tw dataset 89030, open-data table stat_p_116)",
    sourceUrl: "https://data.gov.tw/dataset/89030",
    licence:
      "Government Open Data License, version 1.0 (as listed on data.gov.tw)",
    method:
      "PM2.5 in micrograms per cubic metre: the ministry's average over the general automatic monitoring stations of each county, for the whole year",
    fetchedAt,
    firstYear: years[0],
    lastYear: years[years.length - 1],
    national: series("總計"),
    counties: Object.entries(counties).map(([zh, [code, en]]) => ({
      code,
      zh,
      en,
      values: series(zh),
    })),
  };
}

async function fetchAll(key) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const url = `https://data.moenv.gov.tw/api/v2/stat_p_116?api_key=${key}&limit=1000&offset=${offset}&sort=ImportDate%20desc&format=JSON`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`MOENV answered ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const from = process.argv.indexOf("--from");
  let rows;
  if (from !== -1) {
    rows = JSON.parse(readFileSync(process.argv[from + 1], "utf8"));
  } else {
    const key = process.env.MOENV_API_KEY;
    if (!key) {
      console.error("Set MOENV_API_KEY, or pass --from saved-rows.json");
      process.exit(1);
    }
    rows = await fetchAll(key);
  }
  const data = build(rows, new Date().toISOString().slice(0, 10));
  const gaps = data.counties.filter((county) =>
    Object.values(county.values).some((value) => value === null),
  );
  writeFileSync(
    path.join(root, "src/data/air-county.json"),
    `${JSON.stringify(data, null, 2)}\n`,
  );
  console.log(
    `${data.counties.length} counties, ${data.firstYear}-${data.lastYear}, ${gaps.length} with a gap`,
  );
}
