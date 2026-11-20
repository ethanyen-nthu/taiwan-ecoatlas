import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Numbers that pages and lessons quote, counted from the published data
 *  files at build time so they cannot drift from what the map shows. */
export interface Tally {
  name: string;
  count: number;
}
export interface CountyName {
  code: string;
  en: string;
  zh: string;
}
export interface SpeciesCount {
  id: string;
  name: string;
  count: number;
}
export interface AtlasFacts {
  counties: CountyName[];
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
    topSpecies: (SpeciesCount & {
      category: string;
      yearCounts: Record<string, number>;
    })[];
    /** Five most recorded species in each county, by county code. */
    speciesByCounty: Record<string, SpeciesCount[]>;
  };
  culture: {
    villages: number;
    /** Group labels exactly as the source lists them (some name several peoples). */
    groups: Tally[];
    /** Villages whose label names each single people. */
    peoples: Tally[];
    /** Labels that name more than one people, and the villages under them. */
    sharedLabels: { labels: number; villages: number };
    byCounty: Tally[];
    groupsByCounty: Record<string, Tally[]>;
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
      forestKm2: number;
      builtUpKm2: number;
      agricultureKm2: number;
    }[];
    unavailable: CountyName[];
  };
  urban: {
    parks: number;
    parkTrees: number;
    riversideTrees: number;
  };
}

const root = path.join(process.cwd(), "public/data");
const read = async <T>(file: string) =>
  JSON.parse(await readFile(path.join(root, file), "utf8")) as T;

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
  const [
    wildlife,
    species,
    villages,
    studies,
    land,
    landCounties,
    urbanMeta,
    cultureMeta,
    shapes,
  ] = await Promise.all([
    read<
      Features<{
        category: string | null;
        date: string | null;
        countyCode: string | null;
      }>
    >("atlas/wildlife.geojson"),
    read<{
      species: {
        id: string;
        name: string;
        category: string;
        count: number;
        yearCounts: Record<string, number>;
        countyCounts: Record<string, number>;
      }[];
    }>("atlas/wildlife.species.json"),
    read<Features<{ group: string | null; countyCode: string | null }>>(
      "atlas/villages.geojson",
    ),
    read<unknown[]>("atlas/cultural-trails.json"),
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
    }>("atlas/landcover-2023.statistics.json"),
    read<
      Features<{
        countyCode: string;
        forestAreaKm2: number;
        builtUpAreaKm2: number;
        agricultureAreaKm2: number;
      }>
    >("atlas/landcover-2023-counties.geojson"),
    read<Metadata>("atlas/urban.metadata.json"),
    read<Metadata>("atlas/culture.metadata.json"),
    read<
      Features<{ COUNTYCODE: string; COUNTYENG: string; COUNTYNAME: string }>
    >("counties.geojson"),
  ]);
  const dates = wildlife.features
    .map((feature) => feature.properties.date)
    .filter((date): date is string => !!date)
    .sort();
  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const date of dates) byMonth[Number(date.slice(5, 7)) - 1] += 1;
  const count = (meta: Metadata, id: string) =>
    meta.datasets.find((dataset) => dataset.id === id)?.recordCount ?? 0;
  const areas = new Map(
    landCounties.features.map((f) => [f.properties.countyCode, f.properties]),
  );
  const counties = shapes.features.map(({ properties: p }) => ({
    code: p.COUNTYCODE,
    en: p.COUNTYENG,
    zh: p.COUNTYNAME,
  }));
  const speciesByCounty: Record<string, SpeciesCount[]> = {};
  for (const { code } of counties) {
    speciesByCounty[code] = species.species
      .filter((item) => (item.countyCounts?.[code] ?? 0) > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        count: item.countyCounts[code],
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
  }
  const groupsByCounty: Record<string, Tally[]> = {};
  for (const { code } of counties)
    groupsByCounty[code] = tally(
      villages.features.filter((f) => f.properties.countyCode === code),
      (f) => f.properties.group,
    );
  return {
    counties,
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
        .map(({ id, name, category, count, yearCounts }) => ({
          id,
          name,
          category,
          count,
          yearCounts,
        })),
      speciesByCounty,
    },
    culture: {
      villages: villages.features.length,
      groups: tally(villages.features, (f) => f.properties.group),
      peoples: tally(
        villages.features.flatMap((f) =>
          (f.properties.group || "").split("、").filter(Boolean),
        ),
        (name) => name,
      ),
      sharedLabels: {
        labels: new Set(
          villages.features
            .map((f) => f.properties.group || "")
            .filter((group) => group.includes("、")),
        ).size,
        villages: villages.features.filter((f) =>
          (f.properties.group || "").includes("、"),
        ).length,
      },
      byCounty: tally(villages.features, (f) => f.properties.countyCode),
      groupsByCounty,
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
          forestKm2: areas.get(row.countyCode)?.forestAreaKm2 ?? 0,
          builtUpKm2: areas.get(row.countyCode)?.builtUpAreaKm2 ?? 0,
          agricultureKm2: areas.get(row.countyCode)?.agricultureAreaKm2 ?? 0,
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
