// Summarises the atlas's own dated records by year, so the "over time" pages
// can show real, reproducible numbers. Output: src/content/year-summaries.json.
// Run: node scripts/build-year-summaries.mjs
// A test (tests/year-summaries.test.ts) recomputes these numbers from the
// GeoJSON files and fails if the committed summary has drifted.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlas = (name) =>
  JSON.parse(readFileSync(path.join(root, "public/data/atlas", name), "utf8"));

export function summarise(read = atlas) {
  const wildlife = read("wildlife.geojson").features.map((f) => f.properties);
  const years = [...new Set(wildlife.map((p) => p.date.slice(0, 4)))].sort();
  const classes = ["Amphibia", "Reptilia", "Mammalia", "Aves", "Malacostraca"];
  const wildlifeByYear = years.map((year) => {
    const rows = wildlife.filter((p) => p.date.startsWith(year));
    const byClass = Object.fromEntries(
      classes.map((name) => [
        name,
        rows.filter((p) => p.category === name).length,
      ]),
    );
    const byMonth = Array.from(
      { length: 12 },
      (_, month) =>
        rows.filter((p) => Number(p.date.slice(5, 7)) === month + 1).length,
    );
    return {
      year: Number(year),
      records: rows.length,
      taxa: new Set(rows.map((p) => p.speciesId)).size,
      byClass,
      byMonth,
    };
  });
  const countyTotals = new Map();
  for (const p of wildlife) {
    const entry = countyTotals.get(p.countyCode) ?? { code: p.countyCode };
    entry.total = (entry.total ?? 0) + 1;
    entry[p.date.slice(0, 4)] = (entry[p.date.slice(0, 4)] ?? 0) + 1;
    countyTotals.set(p.countyCode, entry);
  }
  const countyNames = new Map(
    JSON.parse(
      readFileSync(path.join(root, "public/data/counties.geojson"), "utf8"),
    ).features.map((f) => [
      f.properties.COUNTYCODE,
      { en: f.properties.COUNTYENG, zh: f.properties.COUNTYNAME },
    ]),
  );
  const topCounties = [...countyTotals.values()]
    .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code))
    .slice(0, 8)
    .map((entry) => ({
      code: entry.code,
      name: countyNames.get(entry.code),
      total: entry.total,
      byYear: Object.fromEntries(years.map((y) => [y, entry[y] ?? 0])),
    }));

  const parks = read("taipei-parks.geojson").features.map((f) => f.properties);
  const dated = parks.filter((p) => Number.isInteger(p.constructionYear));
  const decades = new Map();
  for (const p of dated) {
    const decade = Math.floor(p.constructionYear / 10) * 10;
    const entry = decades.get(decade) ?? { decade, parks: 0, areaM2: 0 };
    entry.parks += 1;
    entry.areaM2 += Number.isFinite(p.areaM2) ? p.areaM2 : 0;
    decades.set(decade, entry);
  }
  const byDecade = [...decades.values()]
    .sort((a, b) => a.decade - b.decade)
    .map((entry) => ({
      decade: entry.decade,
      parks: entry.parks,
      areaHa: Math.round(entry.areaM2 / 100) / 100,
    }));
  const byYearAsc = [...dated].sort(
    (a, b) => a.constructionYear - b.constructionYear,
  );
  const named = (p) => ({
    en: p.title,
    zh: p.titleZh ?? p.title,
    year: p.constructionYear,
  });

  const surveyYears = (file) => {
    const rows = read(file).features.map((f) => f.properties);
    const counts = {};
    let undated = 0;
    for (const p of rows) {
      if (!p.date) undated += 1;
      else counts[p.date.slice(0, 4)] = (counts[p.date.slice(0, 4)] ?? 0) + 1;
    }
    const dates = rows
      .map((p) => p.date)
      .filter(Boolean)
      .sort();
    return {
      total: rows.length,
      undated,
      byYear: counts,
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
    };
  };

  return {
    generatedBy: "scripts/build-year-summaries.mjs",
    wildlife: {
      records: wildlife.length,
      years: wildlifeByYear,
      topCounties,
    },
    parks: {
      total: parks.length,
      withYear: dated.length,
      withoutYear: parks.length - dated.length,
      byDecade,
      oldest: named(byYearAsc[0]),
      newest: named(byYearAsc[byYearAsc.length - 1]),
    },
    trees: {
      park: surveyYears("taipei-park-trees.geojson"),
      riverside: surveyYears("taipei-riverside-trees.geojson"),
    },
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const out = path.join(root, "src/content/year-summaries.json");
  writeFileSync(out, JSON.stringify(summarise(), null, 2) + "\n");
  console.log("wrote", path.relative(root, out));
}
