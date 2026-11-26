import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { glossary } from "@/content/glossary";
import { lessonMeta } from "@/content/lesson-index";
import { peopleBriefs, peopleByGroup } from "@/content/peoples-index";
import { findSpeciesInfo } from "@/content/species-info";
import type { SearchRow } from "@/lib/search";
import { pageRows } from "@/lib/search-pages";
import { loadPlants } from "./plants";

const dataDir = path.join(process.cwd(), "public/data");
const readJson = async <T>(file: string) =>
  JSON.parse(await readFile(path.join(dataDir, file), "utf8")) as T;

interface CountyProps {
  COUNTYCODE: string;
  COUNTYNAME: string;
  COUNTYENG: string;
}
interface VillageProps {
  id: string;
  title: string;
  titleZh: string;
  group: string;
  traditionalName: string | null;
  countyCode: string;
  countyName: string | null;
  township: string | null;
  village: string | null;
}
interface SpeciesRecord {
  id: string;
  name: string;
  scientificName: string | null;
  family: string | null;
  category: string | null;
}

/** The start of a long definition, cut at a space. */
function clip(text: string, length = 110) {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 60 ? space : length)}…`;
}

let cached: Promise<SearchRow[]> | null = null;

/** Everything the search page can find, built once from the same content and
 *  data files the pages themselves use. */
export function searchRows(): Promise<SearchRow[]> {
  cached ??= build();
  return cached;
}

async function build(): Promise<SearchRow[]> {
  const [counties, villages, species, plants] = await Promise.all([
    readJson<{ features: { properties: CountyProps }[] }>("counties.geojson"),
    readJson<{ features: { properties: VillageProps }[] }>(
      "atlas/villages.geojson",
    ),
    readJson<{ species: SpeciesRecord[] }>("atlas/wildlife.species.json"),
    loadPlants(),
  ]);
  const countyEnglish = new Map(
    counties.features.map(({ properties }) => [
      properties.COUNTYCODE,
      properties.COUNTYENG,
    ]),
  );

  const rows: SearchRow[] = [...pageRows()];

  for (const { properties } of counties.features) {
    rows.push([
      "county",
      properties.COUNTYENG,
      properties.COUNTYNAME,
      `/county/${properties.COUNTYCODE}`,
    ]);
  }

  for (const people of peopleBriefs) {
    rows.push([
      "people",
      people.name.en,
      people.name.zh,
      `/culture/peoples/${people.slug}`,
      [people.selfName, people.where.en, people.where.zh]
        .filter(Boolean)
        .join(" "),
      [people.where.en, people.where.zh],
    ]);
  }

  for (const lesson of lessonMeta) {
    rows.push([
      "lesson",
      lesson.title.en,
      lesson.title.zh,
      `/teach/${lesson.slug}`,
      `${lesson.summary.en} ${lesson.summary.zh}`,
      [`${lesson.minutes} min`, `${lesson.minutes} 分鐘`],
    ]);
  }

  for (const term of glossary) {
    rows.push([
      "term",
      term.term.en,
      term.term.zh,
      `/teach/glossary#${term.id}`,
      `${term.meaning.en} ${term.meaning.zh}`,
      [clip(term.meaning.en), clip(term.meaning.zh)],
    ]);
  }

  for (const item of species.species) {
    const info = findSpeciesInfo(item.scientificName || item.name);
    const scientific = item.scientificName || item.name;
    rows.push([
      "animal",
      info?.en ?? scientific,
      info?.zh ?? scientific,
      `/wildlife/species/${item.id}`,
      [scientific, info?.aka, item.family, item.category]
        .filter(Boolean)
        .join(" "),
      scientific,
    ]);
  }

  for (const row of plants.rows) {
    rows.push([
      "tree",
      row.en ?? row.sci ?? row.name,
      row.name,
      `/plants/${encodeURIComponent(row.name)}`,
      [row.sci, row.family, row.familyZh].filter(Boolean).join(" "),
      row.sci ?? "",
    ]);
  }

  for (const { properties: village } of villages.features) {
    const people = peopleByGroup.get(village.group);
    rows.push([
      "village",
      village.title,
      village.titleZh,
      `/culture/places/${village.id}`,
      [
        village.traditionalName,
        people?.name.en,
        village.group,
        village.countyName,
        countyEnglish.get(village.countyCode),
        village.township,
        village.village,
      ]
        .filter(Boolean)
        .join(" "),
      [
        [
          people?.name.en ?? village.group,
          countyEnglish.get(village.countyCode),
        ]
          .filter(Boolean)
          .join(" · "),
        [village.group, village.countyName, village.township]
          .filter(Boolean)
          .join("・"),
      ],
    ]);
  }

  return rows;
}
