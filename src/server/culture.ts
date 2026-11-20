import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AtlasCollection,
  AtlasFeature,
  AtlasManifest,
} from "@/lib/atlas-types";
import {
  buildOutlineMap,
  distanceKm,
  type MapDot,
  type OutlineFile,
} from "@/lib/outline-map";
import type {
  NearbyVillage,
  PeopleCardData,
  PeoplePageData,
  VillageData,
} from "@/lib/culture-types";
import {
  peopleBriefs,
  peopleBySlug,
  peoplesOfLabel,
} from "@/content/peoples-index";
import { profileBySlug } from "@/content/peoples";

const dataDir = path.join(process.cwd(), "public/data");

interface Loaded {
  villages: AtlasFeature[];
  outlines: OutlineFile;
  manifest: AtlasManifest;
  /** Villages naming each people (a shared village counts for each). */
  counts: Map<string, number>;
}
let loaded: Promise<Loaded> | null = null;

export function loadCulture(): Promise<Loaded> {
  loaded ??= Promise.all([
    readFile(path.join(dataDir, "atlas/villages.geojson"), "utf8"),
    readFile(path.join(dataDir, "county-outlines.json"), "utf8"),
    readFile(path.join(dataDir, "atlas/culture.metadata.json"), "utf8"),
  ]).then(([v, o, m]) => {
    const villages = (JSON.parse(v) as AtlasCollection).features.filter(
      (feature) => feature.geometry.type === "Point",
    );
    const counts = new Map<string, number>();
    for (const feature of villages)
      for (const people of peoplesOfLabel(feature.properties.group))
        counts.set(people.slug, (counts.get(people.slug) || 0) + 1);
    return {
      villages,
      outlines: JSON.parse(o) as OutlineFile,
      manifest: JSON.parse(m) as AtlasManifest,
      counts,
    };
  });
  return loaded;
}

const text = (value: unknown) =>
  typeof value === "string" && value ? value : null;
const coordsOf = (feature: AtlasFeature): [number, number] =>
  feature.geometry.type === "Point"
    ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
    : [0, 0];

export function peopleCard(slug: string, counts: Map<string, number>) {
  const profile = profileBySlug.get(slug);
  if (!profile) return null;
  const card: PeopleCardData = {
    slug,
    name: profile.name,
    selfName: profile.selfName,
    recognised: profile.recognised,
    population: profile.population,
    official: !!profile.official,
    where: profile.where,
    summary: profile.summary,
    line: profile.line,
    terms: profile.terms,
    villages: counts.get(slug) || 0,
  };
  return card;
}

export async function villageData(id: string): Promise<VillageData | null> {
  const { villages, outlines, manifest, counts } = await loadCulture();
  const feature = villages.find((item) => item.properties.id === id);
  if (!feature) return null;
  const dataset = manifest.datasets.find(
    (item) => item.sourceId === feature.properties.sourceId,
  );
  if (!dataset) return null;
  const p = feature.properties,
    here = coordsOf(feature),
    mine = peoplesOfLabel(p.group),
    mineSlugs = new Set(mine.map((people) => people.slug));
  const others = villages
    .filter((item) => item.properties.id !== id)
    .map((item) => ({ item, km: distanceKm(here, coordsOf(item)) }))
    .sort((a, b) => a.km - b.km);
  const nearby: NearbyVillage[] = others.slice(0, 8).map(({ item, km }) => {
    const peoples = peoplesOfLabel(item.properties.group);
    return {
      id: item.properties.id,
      titleZh: text(item.properties.titleZh) || item.properties.title,
      title: item.properties.title,
      km: Math.round(km * 10) / 10,
      township: text(item.properties.township),
      countyName: text(item.properties.countyName),
      peoples: peoples.map((people) => people.name),
      same: peoples.some((people) => mineSlugs.has(people.slug)),
    };
  });
  const sharedPoint = others
    .filter(({ km }) => km === 0)
    .map(({ item }) => ({
      id: item.properties.id,
      titleZh: text(item.properties.titleZh) || item.properties.title,
      title: item.properties.title,
    }));
  const township = text(p.township);
  const sameTownship = township
    ? villages.filter(
        (item) =>
          item.properties.countyCode === p.countyCode &&
          item.properties.township === township,
      )
    : [];
  const byPeople = new Map<
    string,
    { name: PeopleCardData["name"]; n: number }
  >();
  for (const item of sameTownship)
    for (const people of peoplesOfLabel(item.properties.group)) {
      const row = byPeople.get(people.slug) || { name: people.name, n: 0 };
      row.n += 1;
      byPeople.set(people.slug, row);
    }
  const dots: MapDot[] = [
    {
      id: p.id,
      lon: here[0],
      lat: here[1],
      kind: "self",
      label: {
        en: p.title,
        zh: text(p.titleZh) || p.title,
      },
    },
    ...others.slice(0, 12).map(({ item }): MapDot => {
      const c = coordsOf(item);
      return {
        id: item.properties.id,
        lon: c[0],
        lat: c[1],
        kind: peoplesOfLabel(item.properties.group).some((people) =>
          mineSlugs.has(people.slug),
        )
          ? "same"
          : "other",
        label: {
          en: item.properties.title,
          zh: text(item.properties.titleZh) || item.properties.title,
        },
        href: `/culture/places/${encodeURIComponent(item.properties.id)}`,
      };
    }),
  ];
  const countyCode = text(p.countyCode);
  return {
    id: p.id,
    titleZh: text(p.titleZh) || p.title,
    title: p.title,
    traditionalName: text(p.traditionalName),
    group: text(p.group) || "",
    countyName: text(p.countyName),
    countyEn: countyCode ? outlines[countyCode]?.en || null : null,
    township,
    villageUnit: text(p.village),
    referencePoint: text(p.publicReferencePoint),
    listedAt: text(p.listedAt),
    sourceRecordId: text(p.sourceRecordId),
    sourceId: p.sourceId,
    sourceUrl: text(p.sourceUrl) || dataset.sourceUrl,
    coords: here,
    peoples: mine
      .map((people) => peopleCard(people.slug, counts))
      .filter((card): card is PeopleCardData => !!card),
    map: buildOutlineMap(outlines, {
      dots,
      focus: countyCode ? [countyCode] : [],
      width: 380,
      maxHeight: 380,
      pad: 0.06,
      minSpan: 0.3,
    }),
    nearby,
    sharedPoint,
    townshipSummary:
      township && sameTownship.length
        ? {
            name: township,
            total: sameTownship.length,
            byPeople: [...byPeople.values()].sort((a, b) => b.n - a.n),
          }
        : null,
    dataset: {
      title: dataset.title,
      licence: dataset.licence,
      licenceUrl: dataset.licenceUrl,
      limitation: dataset.limitation,
    },
  };
}

export async function peopleVillageCounts() {
  return (await loadCulture()).counts;
}

export async function peoplePageData(
  slug: string,
): Promise<PeoplePageData | null> {
  const brief = peopleBySlug.get(slug);
  if (!brief) return null;
  const { villages, outlines, counts } = await loadCulture();
  const mine = villages.filter((item) =>
    peoplesOfLabel(item.properties.group).some(
      (people) => people.slug === slug,
    ),
  );
  const byCounty = new Map<string, PeoplePageData["counties"][number]>();
  const neighbours = new Map<
    string,
    { slug: string; name: typeof brief.name; shared: number }
  >();
  for (const item of mine) {
    const code = text(item.properties.countyCode) || "";
    const row = byCounty.get(code) || {
      code,
      name: text(item.properties.countyName) || code,
      en: outlines[code]?.en || code,
      n: 0,
      villages: [],
    };
    row.n += 1;
    row.villages.push({
      id: item.properties.id,
      titleZh: text(item.properties.titleZh) || item.properties.title,
      title: item.properties.title,
      township: text(item.properties.township),
    });
    byCounty.set(code, row);
    for (const people of peoplesOfLabel(item.properties.group))
      if (people.slug !== slug) {
        const entry = neighbours.get(people.slug) || {
          slug: people.slug,
          name: people.name,
          shared: 0,
        };
        entry.shared += 1;
        neighbours.set(people.slug, entry);
      }
  }
  const counties = [...byCounty.values()].sort(
    (a, b) => b.n - a.n || a.code.localeCompare(b.code),
  );
  const index = peopleBriefs.findIndex((item) => item.slug === slug),
    prev =
      peopleBriefs[(index + peopleBriefs.length - 1) % peopleBriefs.length],
    next = peopleBriefs[(index + 1) % peopleBriefs.length];
  const dots: MapDot[] = mine.map((item) => {
    const c = coordsOf(item);
    return {
      id: item.properties.id,
      lon: c[0],
      lat: c[1],
      kind: "same",
      label: {
        en: item.properties.title,
        zh: text(item.properties.titleZh) || item.properties.title,
      },
    };
  });
  void counts;
  return {
    slug,
    villages: mine.length,
    counties,
    map: buildOutlineMap(outlines, {
      dots,
      focus: counties.map((row) => row.code),
      width: 380,
      maxHeight: 560,
      pad: 0.12,
    }),
    prev: { slug: prev.slug, name: prev.name },
    next: { slug: next.slug, name: next.name },
    neighbours: [...neighbours.values()].sort((a, b) => b.shared - a.shared),
  };
}
