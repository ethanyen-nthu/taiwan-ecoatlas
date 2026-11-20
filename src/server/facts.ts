import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Numbers that pages and lessons quote, counted from the published data
 *  files at build time so they cannot drift from what the map shows. */
export interface Tally {
  name: string;
  count: number;
}
export interface AtlasFacts {
  wildlife: {
    records: number;
    species: number;
    firstDate: string;
    lastDate: string;
    classes: Tally[];
    byYear: Tally[];
    /** Records in January to December, all years together. */
    byMonth: number[];
    byCounty: Tally[];
    topSpecies: { id: string; name: string; category: string; count: number }[];
  };
  culture: {
    villages: number;
    groups: Tally[];
    byCounty: Tally[];
    trails: number;
    studies: number;
  };
  forests: {
    year: number;
    counties: {
      code: string;
      en: string;
      zh: string;
      sharePct: number;
      coveragePct: number;
      areaKm2: number;
    }[];
    unavailable: { code: string; en: string; zh: string }[];
  };
  urban: {
    parks: number;
    parkTrees: number;
    riversideTrees: number;
  };
}

const directory = path.join(process.cwd(), "public/data/atlas");
const read = async <T>(file: string) =>
  JSON.parse(await readFile(path.join(directory, file), "utf8")) as T;

function tally<T>(items: T[], key: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = key(item);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

type Metadata = { datasets: { id: string; recordCount: number }[] };
type Features<P> = { features: { properties: P }[] };

async function load(): Promise<AtlasFacts> {
  const [wildlife, species, villages, studies, land, urbanMeta, cultureMeta] =
    await Promise.all([
      read<
        Features<{
          category: string | null;
          date: string | null;
          countyCode: string | null;
        }>
      >("wildlife.geojson"),
      read<{
        species: {
          id: string;
          name: string;
          category: string;
          count: number;
        }[];
      }>("wildlife.species.json"),
      read<Features<{ group: string | null; countyCode: string | null }>>(
        "villages.geojson",
      ),
      read<unknown[]>("cultural-trails.json"),
      read<{
        year: number;
        countyStatistics: {
          countyCode: string;
          name: { en: string; zh: string };
          countyAreaKm2: number;
          mappedCoveragePct: number;
          forestShareMappedPct: number | null;
          available: boolean;
        }[];
      }>("landcover-2023.statistics.json"),
      read<Metadata>("urban.metadata.json"),
      read<Metadata>("culture.metadata.json"),
    ]);
  const dates = wildlife.features
    .map((feature) => feature.properties.date)
    .filter((date): date is string => !!date)
    .sort();
  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const date of dates) byMonth[Number(date.slice(5, 7)) - 1] += 1;
  const count = (meta: Metadata, id: string) =>
    meta.datasets.find((dataset) => dataset.id === id)?.recordCount ?? 0;
  return {
    wildlife: {
      records: wildlife.features.length,
      species: species.species.length,
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
      classes: tally(wildlife.features, (f) => f.properties.category),
      byYear: tally(dates, (date) => date.slice(0, 4)).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      byMonth,
      byCounty: tally(wildlife.features, (f) => f.properties.countyCode),
      topSpecies: [...species.species]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(({ id, name, category, count }) => ({
          id,
          name,
          category,
          count,
        })),
    },
    culture: {
      villages: villages.features.length,
      groups: tally(villages.features, (f) => f.properties.group),
      byCounty: tally(villages.features, (f) => f.properties.countyCode),
      trails: count(cultureMeta, "public-historic-trails"),
      studies: studies.length,
    },
    forests: {
      year: land.year,
      counties: land.countyStatistics
        .filter((row) => row.available && row.forestShareMappedPct !== null)
        .map((row) => ({
          code: row.countyCode,
          en: row.name.en,
          zh: row.name.zh,
          sharePct: row.forestShareMappedPct as number,
          coveragePct: row.mappedCoveragePct,
          areaKm2: row.countyAreaKm2,
        }))
        .sort((a, b) => b.sharePct - a.sharePct),
      unavailable: land.countyStatistics
        .filter((row) => !row.available)
        .map((row) => ({
          code: row.countyCode,
          en: row.name.en,
          zh: row.name.zh,
        })),
    },
    urban: {
      parks: count(urbanMeta, "taipei-parks"),
      parkTrees: count(urbanMeta, "taipei-park-trees"),
      riversideTrees: count(urbanMeta, "taipei-riverside-trees"),
    },
  };
}

let cached: Promise<AtlasFacts> | null = null;
export function atlasFacts() {
  return (cached ??= load());
}
