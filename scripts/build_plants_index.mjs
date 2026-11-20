// Summarise the two Taipei tree inventories into one small index per species,
// so the plants guide does not have to read 95,000 individual trees.
//   node scripts/build_plants_index.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const dir = new URL("../public/data/atlas/", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));

// Different inventories spell the same tree differently.
const aliases = {
  欖仁樹: "欖仁",
  落羽松: "落羽杉",
  柚: "柚子",
  烏臼: "烏桕",
  檬果: "芒果",
  番石榴: "芭樂",
  艷紫荊: "洋紫荊",
  臺灣櫸: "櫸",
  肯氏蒲桃: "肯氏蒲桃",
};
// Rows that are not a living species.
const notSpecies = new Set(["枯枝", "枯死", "死亡", "", "未知", "無"]);

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round = (value, digits = 1) =>
  value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;
const top = (map, n) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

const species = new Map();
let total = 0;
let skipped = 0;
for (const [file, source] of [
  ["taipei-park-trees.geojson", "park"],
  ["taipei-riverside-trees.geojson", "riverside"],
]) {
  for (const feature of read(file).features) {
    const p = feature.properties;
    const raw = String(p.species || "").trim();
    if (notSpecies.has(raw)) {
      skipped++;
      continue;
    }
    const name = aliases[raw] || raw;
    const item = species.get(name) || {
      name,
      count: 0,
      park: 0,
      riverside: 0,
      heights: [],
      diameters: [],
      districts: new Map(),
      places: new Map(),
      scientific: new Map(),
      families: new Map(),
      years: new Map(),
    };
    item.count++;
    item[source]++;
    total++;
    // The sources contain obvious entry errors (a 797 m tree); keep plausible values.
    if (Number.isFinite(p.heightM) && p.heightM > 0.3 && p.heightM <= 60)
      item.heights.push(p.heightM);
    if (
      Number.isFinite(p.diameterCm) &&
      p.diameterCm > 1 &&
      p.diameterCm <= 400
    )
      item.diameters.push(p.diameterCm);
    if (p.district)
      item.districts.set(p.district, (item.districts.get(p.district) || 0) + 1);
    if (p.park) item.places.set(p.park, (item.places.get(p.park) || 0) + 1);
    if (p.scientificName)
      item.scientific.set(
        p.scientificName,
        (item.scientific.get(p.scientificName) || 0) + 1,
      );
    if (p.family)
      item.families.set(p.family, (item.families.get(p.family) || 0) + 1);
    species.set(name, item);
  }
}

const list = [...species.values()]
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hant"))
  .map((item) => ({
    name: item.name,
    count: item.count,
    park: item.park,
    riverside: item.riverside,
    medianHeightM: round(median(item.heights)),
    p90HeightM: round(
      item.heights.length
        ? [...item.heights].sort((a, b) => a - b)[
            Math.floor(item.heights.length * 0.9)
          ]
        : null,
    ),
    medianDiameterCm: round(median(item.diameters)),
    places: item.places.size,
    districts: top(item.districts, 4),
    topPlaces: top(item.places, 3),
    sourceScientific: top(item.scientific, 1)[0]?.[0] || null,
    sourceFamily: top(item.families, 1)[0]?.[0] || null,
  }));

const body = {
  generatedFrom: [
    "taipei-park-trees.geojson",
    "taipei-riverside-trees.geojson",
  ],
  totalTrees: total,
  skippedRows: skipped,
  speciesCount: list.length,
  note: "Heights above 60 m and diameters above 400 cm were treated as entry errors and left out of medians. Names that the two inventories spell differently were merged.",
  species: list,
};
const text = JSON.stringify(body);
writeFileSync(new URL("plants.index.json", dir), text);
console.log(
  `plants.index.json: ${list.length} species, ${total} trees, ${(text.length / 1024).toFixed(0)} KB, sha256 ${createHash("sha256").update(text).digest("hex").slice(0, 12)}`,
);
