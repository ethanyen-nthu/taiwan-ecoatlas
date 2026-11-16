import type {
  Feature,
  FeatureCollection,
  Point,
  Polygon,
  MultiPolygon,
  LineString,
  MultiLineString,
} from "geojson";
import type { Localized } from "./types";

export type AtlasSection =
  "environment" | "forests" | "wildlife" | "culture" | "urban";
export type AtlasProperties = {
  id: string;
  sourceId: string;
  title: string;
  titleZh?: string | null;
  countyCode: string | null;
  date: string | null;
  category: string | null;
  [key: string]: string | number | boolean | null | undefined;
};
export type AtlasGeometry =
  Point | Polygon | MultiPolygon | LineString | MultiLineString;
export type AtlasFeature = Feature<AtlasGeometry, AtlasProperties>;
export type AtlasCollection = FeatureCollection<AtlasGeometry, AtlasProperties>;
export interface AtlasDataset {
  id: string;
  section: AtlasSection;
  title: Localized;
  description: Localized;
  sourceId: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string | null;
  status: "available" | "unavailable";
  file: string | null;
  recordCount: number;
  dateRange: [string, string] | null;
  updatedAt: string | null;
  limitation: Localized;
  fields: { key: string; label: Localized; unit?: string }[];
  raster?: {
    url: string;
    coordinates: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ];
    legend: { label: Localized; color: string }[];
  };
  statisticsFile?: string;
}
export interface AtlasManifest {
  section: AtlasSection;
  datasets: AtlasDataset[];
  resources: { title: Localized; url: string; description: Localized }[];
}
export interface AtlasOverlay {
  dataset: AtlasDataset;
  data: AtlasCollection;
  mode: "clusters" | "heatmap";
  color: string;
}
export interface AtlasResult {
  dataset: AtlasDataset;
  collection: AtlasCollection;
  records: AtlasFeature[];
  total: number;
  inViewport: number;
  aggregated: boolean;
  nextOffset: number | null;
  categories: { name: string; count: number }[];
  species: { id: string; name: string; count: number }[];
  counties: {
    code: string;
    count: number;
    value: number | null;
    measured: number;
  }[];
  timeline: {
    period: string;
    count: number;
    value: number | null;
    measured: number;
  }[];
  dateRange: [string, string] | null;
  retrievedAt?: string | null;
  sourceRows?: number;
  status?: string;
}
