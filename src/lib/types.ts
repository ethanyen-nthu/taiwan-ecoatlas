import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
export type Language = "en" | "zh";
export type Localized = { en: string; zh: string };
export type Freshness =
  "fresh" | "stale" | "unavailable" | "not-configured" | "historical-only";
export type ObservationKind = "aqi" | "weather";
export type CountyProperties = {
  COUNTYCODE: string;
  COUNTYNAME: string;
  COUNTYENG: string;
};
export type Counties = FeatureCollection<
  Polygon | MultiPolygon,
  CountyProperties
>;
export interface Observation {
  id: string;
  source: string;
  station: string;
  county: string | null;
  longitude: number;
  latitude: number;
  observedAt: string;
  publishedAt: string | null;
  status: string | null;
  values: Record<string, number | null>;
}
export interface DatasetResponse {
  source: string;
  status: Freshness;
  observations: Observation[];
  lastObservationAt: string | null;
  publishedAt: string | null;
  retrievedAt: string | null;
  checkedAt: string;
  excluded: number;
  duplicates: number;
  message: string | null;
}
