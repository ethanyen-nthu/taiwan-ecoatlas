import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Counties } from "@/lib/types";
import type { AtlasCollection, AtlasDataset } from "@/lib/atlas-types";
import { parseRiver } from "@/lib/river";
import { fetchJson, UpstreamRequestError } from "./http";

export const riverDataset: AtlasDataset = {
  id: "river-quality",
  section: "environment",
  title: { en: "River water-quality samples", zh: "河川水質採樣" },
  description: {
    en: "MOENV field samples with laboratory measurements and reported RPI. Sampling dates are separate from retrieval; publication dates are not inferred.",
    zh: "環境部實地採樣、實驗室測量與官方 RPI。採樣日期與擷取時間分開，未推測發布日期。",
  },
  sourceId: "WQX_P_01",
  sourceUrl: "https://data.moenv.gov.tw/en/dataset/detail/WQX_P_01",
  licence: "Open Government Data License 1.0",
  licenceUrl: "https://data.gov.tw/license",
  status: "available",
  file: null,
  recordCount: 0,
  dateRange: null,
  updatedAt: null,
  limitation: {
    en: "Bounded extract of up to 10,000 indicator rows; not the complete archive or live water conditions. Censored values remain missing. Monthly sampling generally has a publication delay. County averages describe the loaded samples, without rankings.",
    zh: "最多擷取 10,000 筆指標資料，並非完整典藏或即時水況。低於偵測限的測值保留缺值；月採樣通常延後發布。縣市平均僅描述已載入樣本，不作排名。",
  },
  fields: [
    { key: "river", label: { en: "River", zh: "河川" } },
    { key: "basin", label: { en: "Basin", zh: "流域" } },
    {
      key: "do",
      label: { en: "Dissolved oxygen", zh: "溶氧量" },
      unit: "mg/L",
    },
    { key: "bod", label: { en: "BOD", zh: "生化需氧量" }, unit: "mg/L" },
    {
      key: "ss",
      label: { en: "Suspended solids", zh: "懸浮固體" },
      unit: "mg/L",
    },
    {
      key: "nh3n",
      label: { en: "Ammonia nitrogen", zh: "氨氮" },
      unit: "mg/L",
    },
    { key: "rpi", label: { en: "Reported RPI", zh: "官方發布 RPI" } },
  ],
};
const normalName = (text: string) =>
  text
    .toLowerCase()
    .replaceAll("台", "臺")
    .replace(/\s|county|city|[.,'-]/g, "");
let countyNames: Promise<Map<string, string>> | undefined;
export async function getCountyNames() {
  countyNames ??= readFile(
    join(process.cwd(), "public/data/counties.geojson"),
    "utf8",
  ).then((text) => {
    const map = new Map<string, string>();
    for (const feature of (JSON.parse(text) as Counties).features)
      for (const name of [
        feature.properties.COUNTYNAME,
        feature.properties.COUNTYENG,
      ])
        map.set(normalName(name), feature.properties.COUNTYCODE);
    return map;
  });
  return countyNames;
}
export async function codeForName(name: string) {
  return (await getCountyNames()).get(normalName(name)) || null;
}
type RiverSnapshot = {
  collection: AtlasCollection;
  retrievedAt: string | null;
  status: "historical-only" | "stale" | "unavailable" | "not-configured";
  excluded: number;
  sourceRows: number;
};
let cached: RiverSnapshot | undefined,
  pending: Promise<RiverSnapshot> | undefined,
  retryAfter = 0;
export async function riverSnapshot(): Promise<RiverSnapshot> {
  if (!process.env.MOENV_API_KEY)
    return {
      collection: { type: "FeatureCollection", features: [] },
      status: "not-configured",
      retrievedAt: null,
      excluded: 0,
      sourceRows: 0,
    };
  if (cached && Date.now() - Date.parse(cached.retrievedAt!) < 6 * 3600_000)
    return cached;
  if (pending) return pending;
  if (Date.now() < retryAfter)
    return (
      cached || {
        collection: { type: "FeatureCollection", features: [] },
        status: "unavailable",
        retrievedAt: null,
        excluded: 0,
        sourceRows: 0,
      }
    );
  pending = (async () => {
    try {
      const url = new URL("https://data.moenv.gov.tw/api/v2/WQX_P_01");
      url.search = new URLSearchParams({
        api_key: process.env.MOENV_API_KEY!,
        limit: "10000",
        offset: "0",
        format: "json",
      }).toString();
      const names = await getCountyNames();
      const result = parseRiver(
        await fetchJson(url.toString(), {}, 2),
        (name) => names.get(normalName(name)) || null,
      );
      cached = {
        collection: result.collection,
        retrievedAt: new Date().toISOString(),
        status: "historical-only",
        excluded: result.excluded,
        sourceRows: result.sourceRows,
      };
      console.info("river_sync_success", {
        samples: result.collection.features.length,
        excluded: result.excluded,
        sourceRows: result.sourceRows,
      });
      return cached;
    } catch (error) {
      retryAfter = Date.now() + 60_000;
      console.warn("river_sync_failed", {
        retainedSnapshot: !!cached,
        category:
          error instanceof UpstreamRequestError ? error.category : "schema",
        status: error instanceof UpstreamRequestError ? error.status : null,
        networkCode:
          error instanceof UpstreamRequestError ? error.networkCode : null,
      });
      return cached
        ? { ...cached, status: "stale" as const }
        : {
            collection: { type: "FeatureCollection" as const, features: [] },
            status: "unavailable" as const,
            retrievedAt: null,
            excluded: 0,
            sourceRows: 0,
          };
    } finally {
      pending = undefined;
    }
  })();
  return pending;
}
