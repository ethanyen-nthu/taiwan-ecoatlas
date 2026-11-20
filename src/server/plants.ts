import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  findPlant,
  type PlantHabit,
  type PlantOrigin,
} from "../content/plants";

export interface PlantRow {
  name: string;
  count: number;
  park: number;
  riverside: number;
  medianHeightM: number | null;
  p90HeightM: number | null;
  medianDiameterCm: number | null;
  places: number;
  districts: [string, number][];
  topPlaces: [string, number][];
  sci: string | null;
  en: string | null;
  family: string | null;
  familyZh: string | null;
  habit: PlantHabit | null;
  origin: PlantOrigin | null;
  endemic: boolean;
  guided: boolean;
}
interface RawIndex {
  totalTrees: number;
  speciesCount: number;
  note: string;
  species: (Omit<
    PlantRow,
    | "sci"
    | "en"
    | "family"
    | "familyZh"
    | "habit"
    | "origin"
    | "endemic"
    | "guided"
  > & { sourceScientific: string | null; sourceFamily: string | null })[];
}
let cache: Promise<{
  totalTrees: number;
  note: string;
  rows: PlantRow[];
}> | null = null;

export function loadPlants() {
  cache ??= readFile(
    path.join(process.cwd(), "public/data/atlas/plants.index.json"),
    "utf8",
  ).then((text) => {
    const raw = JSON.parse(text) as RawIndex;
    const rows = raw.species.map((item): PlantRow => {
      const info = findPlant(item.name);
      const { sourceScientific, sourceFamily, ...rest } = item;
      return {
        ...rest,
        sci: info?.sci ?? sourceScientific,
        en: info?.en ?? null,
        family: info?.family ?? null,
        familyZh: info?.familyZh ?? sourceFamily,
        habit: info?.habit ?? null,
        origin: info?.origin ?? null,
        endemic: !!info?.endemic,
        guided: !!info,
      };
    });
    return { totalTrees: raw.totalTrees, note: raw.note, rows };
  });
  return cache;
}
