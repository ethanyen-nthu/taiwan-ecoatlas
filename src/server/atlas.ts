import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AtlasCollection,
  AtlasDataset,
  AtlasManifest,
} from "@/lib/atlas-types";
import { observationService } from "./observations";
import { codeForName, riverDataset, riverSnapshot } from "./river";

export const liveDatasets: AtlasDataset[] = [
  {
    id: "live-aqi",
    section: "environment",
    title: { en: "Live air quality", zh: "最新空氣品質" },
    description: {
      en: "Latest official station reports: AQI, PM₂.₅ and PM₁₀.",
      zh: "官方測站最新 AQI、PM₂.₅ 與 PM₁₀ 報告。",
    },
    sourceId: "AQX_P_432",
    sourceUrl: "https://data.moenv.gov.tw/en/dataset/detail/AQX_P_432",
    licence: "Open Government Data License 1.0",
    licenceUrl: "https://data.gov.tw/license",
    status: "available",
    file: null,
    recordCount: 0,
    dateRange: null,
    updatedAt: null,
    limitation: {
      en: "Latest loaded station reports, not a historical archive or population exposure estimate. Comparisons are descriptive station means, with report timestamps and coverage.",
      zh: "僅最新測站報告，並非歷史典藏或人口暴露估計；比較呈現測站平均與時間、涵蓋數。",
    },
    fields: [
      { key: "aqi", label: { en: "AQI", zh: "AQI" } },
      { key: "pm25", label: { en: "PM₂.₅", zh: "PM₂.₅" }, unit: "µg/m³" },
      { key: "pm10", label: { en: "PM₁₀", zh: "PM₁₀" }, unit: "µg/m³" },
    ],
  },
  {
    id: "live-weather",
    section: "environment",
    title: { en: "Live weather stations", zh: "最新氣象測站" },
    description: {
      en: "Measured air temperature, humidity, rainfall and wind from both CWA networks.",
      zh: "兩類氣象署測站的實測氣溫、濕度、雨量與風。",
    },
    sourceId: "O-A0003-001 / O-A0001-001",
    sourceUrl: "https://opendata.cwa.gov.tw/devManual/description",
    licence: "Open Government Data License 1.0",
    licenceUrl: "https://opendata.cwa.gov.tw/about/rules",
    status: "available",
    file: null,
    recordCount: 0,
    dateRange: null,
    updatedAt: null,
    limitation: {
      en: "Air temperature is a station measurement, not satellite surface temperature. Rainfall is the reported daily accumulation; values are not summed across hourly reports or interpreted as a county-wide rainfall total.",
      zh: "氣溫是測站測量，並非衛星地表溫度。雨量為來源發布的當日累積值，不加總逐時報告，也不作全縣總雨量。",
    },
    fields: [
      {
        key: "temperature",
        label: { en: "Air temperature", zh: "氣溫" },
        unit: "°C",
      },
      { key: "humidity", label: { en: "Humidity", zh: "相對濕度" }, unit: "%" },
      {
        key: "rainfall",
        label: { en: "Reported daily rain", zh: "發布之當日累積雨量" },
        unit: "mm",
      },
      {
        key: "windSpeed",
        label: { en: "Wind speed", zh: "風速" },
        unit: "m/s",
      },
      {
        key: "windDirection",
        label: { en: "Wind direction", zh: "風向" },
        unit: "°",
      },
    ],
  },
];
let manifests: AtlasManifest[] | undefined;
export async function atlasCatalogue() {
  if (!manifests)
    manifests = (
      await Promise.all(
        ["forests", "wildlife", "culture", "urban"].map(async (section) => {
          try {
            return JSON.parse(
              await readFile(
                join(
                  process.cwd(),
                  `public/data/atlas/${section}.metadata.json`,
                ),
                "utf8",
              ),
            ) as AtlasManifest;
          } catch {
            return null;
          }
        }),
      )
    ).filter((item): item is AtlasManifest => !!item);
  const asset = (path: string | null | undefined) =>
    path?.startsWith("data/") ? `/${path}` : path;
  return {
    datasets: [
      ...liveDatasets,
      riverDataset,
      ...manifests
        .flatMap((manifest) => manifest.datasets)
        .map((dataset) => ({
          ...dataset,
          file: asset(dataset.file) || null,
          statisticsFile: asset(dataset.statisticsFile) || undefined,
          ...(dataset.raster
            ? { raster: { ...dataset.raster, url: asset(dataset.raster.url)! } }
            : {}),
        })),
    ],
    resources: manifests.flatMap((manifest) =>
      manifest.resources.map((resource) => ({
        ...resource,
        section: manifest.section,
      })),
    ),
  };
}
const collections = new Map<string, Promise<AtlasCollection>>();
export async function atlasCollection(id: string) {
  const dataset = (await atlasCatalogue()).datasets.find(
    (item) => item.id === id,
  );
  if (!dataset) return null;
  if (id === "river-quality") {
    const data = await riverSnapshot();
    return { dataset, ...data };
  }
  if (id === "live-aqi" || id === "live-weather") {
    const data = await observationService.get(
      id === "live-aqi" ? "aqi" : "weather",
    );
    const features = await Promise.all(
      data.observations.map(async (observation) => ({
        type: "Feature" as const,
        id: observation.id,
        geometry: {
          type: "Point" as const,
          coordinates: [observation.longitude, observation.latitude],
        },
        properties: {
          id: observation.id,
          sourceId: observation.source,
          title: observation.station,
          countyCode: await codeForName(observation.county || ""),
          date: observation.observedAt,
          publishedAt: observation.publishedAt || null,
          category: observation.status,
          ...observation.values,
        },
      })),
    );
    return {
      dataset,
      collection: { type: "FeatureCollection" as const, features },
      retrievedAt: data.retrievedAt,
      status: data.status,
    };
  }
  if (!dataset.file || dataset.status !== "available")
    return {
      dataset,
      collection: { type: "FeatureCollection" as const, features: [] },
      retrievedAt: dataset.updatedAt,
      status: dataset.status,
    };
  if (!/^\/data\/atlas\/[a-zA-Z0-9._-]+\.geojson$/.test(dataset.file))
    throw new Error("Invalid published dataset path");
  let promise = collections.get(id);
  if (!promise) {
    promise = readFile(
      join(process.cwd(), "public", dataset.file),
      "utf8",
    ).then((text) => JSON.parse(text) as AtlasCollection);
    collections.set(id, promise);
  }
  return {
    dataset,
    collection: await promise,
    retrievedAt: dataset.updatedAt,
    status: "historical-only",
  };
}
