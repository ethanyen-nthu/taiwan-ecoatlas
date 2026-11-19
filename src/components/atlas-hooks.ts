"use client";
import { useMemo } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import type {
  AtlasCollection,
  AtlasDataset,
  AtlasManifest,
  AtlasOverlay,
} from "@/lib/atlas-types";
export const sectionColors = {
  environment: "#1a7cb0",
  forests: "#4b853e",
  wildlife: "#a06a08",
  culture: "#ae5843",
  urban: "#0a8685",
};
export const emptyAtlas: AtlasCollection = {
  type: "FeatureCollection",
  features: [],
};
export const atlasFetcher = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(55000) });
  if (!response.ok) throw new Error("Dataset unavailable");
  return response.json();
};
export function useAtlasCatalogue() {
  return useSWRImmutable<{
    datasets: AtlasDataset[];
    resources: (AtlasManifest["resources"][number] & { section: string })[];
  }>("/api/atlas", atlasFetcher);
}
export interface AtlasMapFilters {
  start?: string;
  end?: string;
  species?: string;
  category?: string;
  q?: string;
}
export function useAtlasOverlays(
  ids: string[],
  viewport: { bbox: [number, number, number, number]; zoom: number } | null,
  county: string,
  mode: "points" | "density",
  filters: AtlasMapFilters = {},
) {
  const params = new URLSearchParams({ layers: ids.join(","), county });
  if (viewport)
    params.set("bbox", viewport.bbox.map((n) => n.toFixed(4)).join(","));
  for (const key of ["start", "end", "species", "category", "q"] as const)
    if (filters[key]) params.set(key, filters[key]);
  const { data, isLoading, isValidating, error } = useSWR<{
    layers: {
      dataset: AtlasDataset;
      collection: AtlasCollection;
      status: string;
      total: number;
      categories: { name: string; count: number }[];
    }[];
    errors: string[];
  }>(ids.length ? `/api/atlas/map?${params}` : null, atlasFetcher, {
    dedupingInterval: 30000,
    keepPreviousData: true,
    shouldRetryOnError: false,
  });
  const overlays = useMemo<AtlasOverlay[]>(
    () =>
      (data?.layers || [])
        .filter((layer) => ids.includes(layer.dataset.id))
        .map((layer) => ({
          dataset: layer.dataset,
          data: layer.collection,
          mode,
          color: sectionColors[layer.dataset.section],
        })),
    [data, ids, mode],
  );
  return {
    overlays,
    isLoading: isLoading || isValidating,
    error,
    layerDetails: data?.layers || [],
    failedLayers: data?.errors || [],
  };
}
export function useWildlifeSpecies(enabled: boolean) {
  return useSWRImmutable<{
    species: { id: string; name: string; count: number }[];
  }>(enabled ? "/data/atlas/wildlife.species.json" : null, atlasFetcher);
}
