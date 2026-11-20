import type { L } from "@/content/lesson-index";
import type { OutlineMapData } from "./outline-map";

/** What a village page needs to know about one of the peoples it names. */
export interface PeopleCardData {
  slug: string;
  name: L;
  selfName?: string;
  recognised: number | null;
  population: number;
  official: boolean;
  where: L;
  summary: L;
  line: L;
  terms: { term: string; gloss: L }[];
  /** Villages in the atlas listing that name this people. */
  villages: number;
}

export interface NearbyVillage {
  id: string;
  titleZh: string;
  title: string;
  km: number;
  township: string | null;
  countyName: string | null;
  peoples: L[];
  same: boolean;
}

export interface VillageData {
  id: string;
  titleZh: string;
  title: string;
  traditionalName: string | null;
  /** The group label exactly as the source writes it. */
  group: string;
  countyName: string | null;
  countyEn: string | null;
  township: string | null;
  villageUnit: string | null;
  referencePoint: string | null;
  listedAt: string | null;
  sourceRecordId: string | null;
  sourceId: string;
  sourceUrl: string;
  coords: [number, number];
  peoples: PeopleCardData[];
  map: OutlineMapData;
  nearby: NearbyVillage[];
  /** Villages sharing one reference point with this one (same coordinates). */
  sharedPoint: { id: string; titleZh: string; title: string }[];
  townshipSummary: {
    name: string;
    total: number;
    byPeople: { name: L; n: number }[];
  } | null;
  dataset: {
    title: L;
    licence: string;
    licenceUrl: string | null;
    limitation: L;
  };
}

export interface PeopleVillageRow {
  id: string;
  titleZh: string;
  title: string;
  township: string | null;
}
export interface PeopleCountyRow {
  code: string;
  name: string;
  en: string;
  n: number;
  villages: PeopleVillageRow[];
}
export interface PeoplePageData {
  slug: string;
  villages: number;
  counties: PeopleCountyRow[];
  map: OutlineMapData;
  prev: { slug: string; name: L };
  next: { slug: string; name: L };
  /** Other peoples that share at least one listed village with this one. */
  neighbours: { slug: string; name: L; shared: number }[];
}
