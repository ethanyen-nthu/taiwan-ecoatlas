"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChartNoAxesCombined,
  Info,
  Layers3,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  AtlasFeature,
  AtlasOverlay,
  AtlasResult,
  AtlasSection,
} from "@/lib/atlas-types";
import type { Freshness } from "@/lib/types";
import { ContinuousTabs } from "./watermelon/continuous-tabs";
import { useCounties, useLanguage } from "./providers";
import {
  atlasFetcher,
  emptyAtlas,
  sectionColors,
  useAtlasCatalogue,
} from "./atlas-hooks";
import { Status, useFormatTime } from "./status";
import { Footer } from "./footer";
import "./section-workbench.css";

const MapCanvas = dynamic(() => import("./map/map-canvas"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map / 載入地圖</div>,
});
const AtlasCharts = dynamic(() => import("./atlas-charts"), {
  loading: () => <p>Loading charts / 載入圖表</p>,
});
const headings = {
  environment: {
    en: "Our shared environment.",
    zh: "我們共有的環境。",
    eyebrow: ["ENVIRONMENTAL MONITORING", "環境監測"],
    description: [
      "Read the measurements behind the map: air quality, weather and laboratory-tested river samples.",
      "從地圖看見測量：空氣品質、氣象與實驗室檢測的河川採樣。",
    ],
  },
  forests: {
    en: "A changing landscape.",
    zh: "變遷中的地景。",
    eyebrow: ["FORESTS & LAND COVER", "森林與土地覆蓋"],
    description: [
      "Explore the published 2023 land-cover classification and its county statistics. Keep classification, coverage and evidence in view.",
      "探索公開的 2023 土地覆蓋分類與縣市統計，同時理解分類、涵蓋範圍及證據。",
    ],
  },
  wildlife: {
    en: "Life along the roads.",
    zh: "道路旁的生命。",
    eyebrow: ["HISTORICAL WILDLIFE ARCHIVE", "歷史野生動物典藏"],
    description: [
      "Explore a conservation-screened subset of the 2011–2017 roadkill archive. Public map positions are generalized grid centres, not sighting locations.",
      "探索 2011–2017 路死典藏中經保育篩檢的子集。公開地圖位置為概化格網中心，並非實際發現點。",
    ],
  },
  culture: {
    en: "People and place.",
    zh: "人與地方。",
    eyebrow: ["INDIGENOUS CULTURAL ATLAS", "原住民族文化地圖"],
    description: [
      "Follow public village reference points, source-listed names and groups, historical studies and public trail routes.",
      "探索公開部落定位點、來源所列名稱與族群、歷史研究及公開古道路線。",
    ],
  },
  urban: {
    en: "Greener everyday spaces.",
    zh: "更綠的日常空間。",
    eyebrow: ["URBAN ECOLOGY & TEMPERATURE", "都市生態與氣溫"],
    description: [
      "Locate Taipei parks and public trees, then inspect measured station air temperatures. Each inventory keeps its own geographical coverage and survey dates.",
      "尋找臺北公園與公共樹木，再檢視測站實測氣溫。各盤點保留自身地理範圍與調查日期。",
    ],
  },
};
const defaults: Record<AtlasSection, string> = {
  environment: "live-aqi",
  forests: "landcover-2023",
  wildlife: "wildlife",
  culture: "villages",
  urban: "taipei-parks",
};
type Filters = {
  county: string;
  q: string;
  category: string;
  species: string;
  start: string;
  end: string;
  period: string;
  offset: number;
};
const knownMetrics = new Set([
  "aqi",
  "pm25",
  "pm10",
  "temperature",
  "humidity",
  "rainfall",
  "windSpeed",
  "windDirection",
  "do",
  "bod",
  "ss",
  "nh3n",
  "rpi",
  "forestAreaKm2",
  "forestShareMappedPct",
  "mappedCoveragePct",
  "areaM2",
  "heightM",
  "diameterCm",
]);

export function SectionWorkbench({ section }: { section: AtlasSection }) {
  const formatTime = useFormatTime();
  const { language, t } = useLanguage(),
    search = useSearchParams(),
    tabId = useId();
  const catalogue = useAtlasCatalogue(),
    { counties, boundaryError, retryBoundaries } = useCounties();
  const [chosen, setChosen] = useState<string | null>(null),
    [chosenMetric, setChosenMetric] = useState<string | null>(null);
  const [tab, setTab] = useState<"map" | "charts" | "sources">("map"),
    [mode, setMode] = useState<"clusters" | "heatmap">("clusters");
  const [filters, setFilters] = useState<Filters>({
    county: search.get("county") || "",
    q: "",
    category: "",
    species: "",
    start: "",
    end: "",
    period: "month",
    offset: 0,
  });
  const [viewport, setViewport] = useState<{
    bbox: [number, number, number, number];
    zoom: number;
  } | null>(null);
  const [selected, setSelected] = useState<AtlasFeature | null>(null);
  const available = useMemo(
    () =>
      (catalogue.data?.datasets || []).filter(
        (dataset) =>
          dataset.section === section ||
          (section === "urban" && dataset.id === "live-weather"),
      ),
    [catalogue.data, section],
  );
  const requested = chosen || search.get("dataset") || defaults[section];
  const dataset =
    available.find((item) => item.id === requested) ||
    available.find((item) => item.status === "available");
  const metric =
    chosenMetric ??
    (dataset?.id === "live-aqi"
      ? "aqi"
      : dataset?.id === "live-weather"
        ? "temperature"
        : dataset?.id === "river-quality"
          ? "rpi"
          : section === "forests" && dataset?.status === "available"
            ? "forestShareMappedPct"
            : "");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== "" && value !== 0) params.set(key, String(value));
  if (metric) params.set("metric", metric);
  if (viewport && tab === "map")
    params.set(
      "bbox",
      viewport.bbox.map((value) => value.toFixed(4)).join(","),
    );
  const query = dataset ? `/api/atlas/${dataset.id}?${params}` : null;
  const result = useSWR<AtlasResult>(query, atlasFetcher, {
    dedupingInterval: 30000,
    shouldRetryOnError: false,
  });
  const speciesIndex = useSWRImmutable<{
    species: { id: string; name: string; count: number }[];
  }>(
    section === "wildlife" ? "/data/atlas/wildlife.species.json" : null,
    atlasFetcher,
  );
  const culturalStudies = useSWRImmutable<
    | {
        profiles?: { id: string; title: string; titleZh: string }[];
        trails?: { id: string; title: string; titleZh: string }[];
      }
    | { id: string; title: string; titleZh: string }[]
  >(
    section === "culture" ? "/data/atlas/cultural-trails.json" : null,
    atlasFetcher,
  );
  const studies = culturalStudies.data
    ? Array.isArray(culturalStudies.data)
      ? culturalStudies.data
      : culturalStudies.data.profiles || culturalStudies.data.trails || []
    : [];
  const countyNames = useMemo(
    () =>
      Object.fromEntries(
        (counties?.features || []).map((feature) => [
          feature.properties.COUNTYCODE,
          language === "en"
            ? feature.properties.COUNTYENG
            : feature.properties.COUNTYNAME,
        ]),
      ),
    [counties, language],
  );
  const overlays = useMemo<AtlasOverlay[]>(
    () =>
      dataset
        ? [
            {
              dataset: result.data?.dataset || dataset,
              data: result.data?.collection || emptyAtlas,
              color: sectionColors[dataset.section],
              mode,
            },
          ]
        : [],
    [dataset, result.data?.dataset, result.data?.collection, mode],
  );
  const focusedAtlas = useMemo(
    () =>
      selected && dataset ? { datasetId: dataset.id, feature: selected } : null,
    [selected, dataset],
  );
  const onViewport = useCallback(
    (next: { bbox: [number, number, number, number]; zoom: number }) => {
      setViewport((current) =>
        current &&
        current.bbox.map((n) => n.toFixed(4)).join() ===
          next.bbox.map((n) => n.toFixed(4)).join()
          ? current
          : next,
      );
      setFilters((current) =>
        current.offset ? { ...current, offset: 0 } : current,
      );
    },
    [],
  );
  const change = (key: keyof Filters, value: string) => {
    setSelected(null);
    setFilters((current) => ({ ...current, [key]: value, offset: 0 }));
  };
  const choose = (id: string) => {
    setChosen(id);
    setChosenMetric(null);
    setSelected(null);
    setFilters({
      county: "",
      q: "",
      category: "",
      species: "",
      start: "",
      end: "",
      period: "month",
      offset: 0,
    });
  };
  const valueText = (value: unknown) =>
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
        ? value
          ? t("Yes", "是")
          : t("No", "否")
        : typeof value === "number"
          ? value.toLocaleString(language === "en" ? "en" : "zh-TW", {
              maximumFractionDigits: 3,
            })
          : String(value);
  const metricField = dataset?.fields.find((field) => field.key === metric);
  const numericFields =
    dataset?.fields.filter(
      (field) =>
        knownMetrics.has(field.key) ||
        result.data?.records.some(
          (record) => typeof record.properties[field.key] === "number",
        ),
    ) || [];
  const species = speciesIndex.data?.species || result.data?.species || [];
  const title = headings[section];
  return (
    <main
      id="main"
      className="document-page atlas-workbench"
      data-dataset={dataset?.id || ""}
    >
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {title.eyebrow[language === "en" ? 0 : 1]}
          </span>
          <h1>{title[language]}</h1>
          <p>{title.description[language === "en" ? 0 : 1]}</p>
        </div>
        <Layers3 size={46} strokeWidth={1} />
      </div>
      <nav
        className="atlas-section-nav"
        aria-label={t("Atlas subjects", "地圖專題")}
      >
        {(Object.keys(headings) as AtlasSection[]).map((key) => (
          <Link
            key={key}
            href={`/${key}`}
            aria-current={key === section ? "page" : undefined}
          >
            {key === "environment"
              ? t("Environment", "環境")
              : key === "forests"
                ? t("Forests", "森林")
                : key === "wildlife"
                  ? t("Wildlife", "野生動物")
                  : key === "culture"
                    ? t("Culture", "文化")
                    : t("Urban", "都市")}
          </Link>
        ))}
        <Link href="/explore">{t("All layers", "全部圖層")} ↗</Link>
      </nav>
      {catalogue.error && (
        <div className="atlas-notice" role="alert">
          <p>
            {t(
              "The source catalogue is unavailable. Retry the connection.",
              "來源目錄無法取得，請重試連線。",
            )}
          </p>
          <button
            className="button secondary"
            onClick={() => void catalogue.mutate()}
          >
            {t("Retry", "重試")}
          </button>
        </div>
      )}
      <div className="atlas-filters">
        <label>
          <span>{t("Dataset", "資料集")}</span>
          <select
            aria-label={t("Dataset", "資料集")}
            value={dataset?.id || ""}
            onChange={(event) => choose(event.target.value)}
          >
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title[language]}
                {item.status === "unavailable"
                  ? ` · ${t("unavailable", "尚無資料")}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("County", "縣市")}</span>
          <select
            aria-label={t("County", "縣市")}
            value={filters.county}
            onChange={(event) => change("county", event.target.value)}
          >
            <option value="">
              {t("All Taiwan & offshore islands", "全臺灣與離島")}
            </option>
            {Object.entries(countyNames).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("Search records", "搜尋紀錄")}</span>
          <input
            aria-label={t("Search records", "搜尋紀錄")}
            value={filters.q}
            onChange={(event) => change("q", event.target.value)}
            placeholder={t(
              "Name, group, river or identifier",
              "名稱、族群、河川或編號",
            )}
          />
        </label>
        {!!result.data?.categories.length && (
          <label>
            <span>{t("Category", "類別")}</span>
            <select
              aria-label={t("Category", "類別")}
              value={filters.category}
              onChange={(event) => change("category", event.target.value)}
            >
              <option value="">{t("All categories", "所有類別")}</option>
              {result.data.categories.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} ({item.count})
                </option>
              ))}
            </select>
          </label>
        )}
        {!!species.length && (
          <label>
            <span>{t("Species", "物種")}</span>
            <select
              aria-label={t("Species", "物種")}
              value={filters.species}
              onChange={(event) => change("species", event.target.value)}
            >
              <option value="">
                {t("All included species", "所有收錄物種")}
              </option>
              {species.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.count})
                </option>
              ))}
            </select>
          </label>
        )}
        {(dataset?.dateRange ||
          dataset?.id.startsWith("live-") ||
          dataset?.id === "river-quality") && (
          <>
            <label>
              <span>{t("Start date", "起始日期")}</span>
              <input
                aria-label={t("Start date", "起始日期")}
                type="date"
                value={filters.start}
                onChange={(event) => change("start", event.target.value)}
              />
            </label>
            <label>
              <span>{t("End date", "結束日期")}</span>
              <input
                aria-label={t("End date", "結束日期")}
                type="date"
                value={filters.end}
                onChange={(event) => change("end", event.target.value)}
              />
            </label>
          </>
        )}
        <label>
          <span>{t("Metric", "指標")}</span>
          <select
            aria-label={t("Metric", "指標")}
            value={metric}
            onChange={(event) => setChosenMetric(event.target.value)}
          >
            <option value="">{t("Record count", "紀錄數")}</option>
            {numericFields.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label[language]}
                {field.unit ? ` (${field.unit})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("Aggregation", "時間彙整")}</span>
          <select
            aria-label={t("Aggregation", "時間彙整")}
            value={filters.period}
            onChange={(event) => change("period", event.target.value)}
          >
            <option value="day">{t("Daily", "每日")}</option>
            <option value="month">{t("Monthly", "每月")}</option>
            <option value="year">{t("Yearly", "每年")}</option>
          </select>
        </label>
        <button
          className="button secondary atlas-reset"
          onClick={() => choose(dataset?.id || defaults[section])}
        >
          <RefreshCw size={15} />
          {t("Reset filters", "重設篩選")}
        </button>
      </div>
      {dataset && (
        <div className="atlas-notice">
          <Info size={19} />
          <div>
            <strong>{dataset.title[language]}</strong>
            <p>{dataset.limitation[language]}</p>
            {section === "forests" && (
              <p>
                {t(
                  "The public archive contains a 2023 raster and a file labelled 2015; a verified 2013 baseline is not supplied. No 2013–2023 change or deforestation estimate is fabricated.",
                  "公開典藏含 2023 影像與標示為 2015 的檔案，未提供可確認的 2013 基準。本平台不捏造 2013–2023 變遷或毀林估計。",
                )}
              </p>
            )}
          </div>
        </div>
      )}
      {result.error && (
        <div className="atlas-notice" role="alert">
          <p>
            {t(
              "These data could not be loaded. The other sections and official boundary map remain available.",
              "無法載入本資料，其他專題及官方界線地圖仍可使用。",
            )}
          </p>
          <button
            className="button secondary"
            onClick={() => void result.mutate()}
          >
            {t("Retry data", "重試資料")}
          </button>
        </div>
      )}
      <div className="atlas-stat-strip" aria-live="polite">
        <div>
          <span>{t("Matching records", "符合紀錄")}</span>
          <strong>
            {result.data ? result.data.total.toLocaleString() : "—"}
          </strong>
        </div>
        <div>
          <span>{t("In current map view", "目前地圖範圍內")}</span>
          <strong>
            {result.data ? result.data.inViewport.toLocaleString() : "—"}
          </strong>
        </div>
        <div>
          <span>{t("Included record dates", "收錄資料日期")}</span>
          <strong className="atlas-date-stat">
            {result.data?.dateRange?.join(" → ") ||
              t("Not a dated observation series", "非具日期的觀測序列")}
          </strong>
        </div>
        <div>
          <span>{t("Source state", "來源狀態")}</span>
          <Status
            loading={result.isLoading}
            status={
              (result.data?.status === "available"
                ? "historical-only"
                : result.data?.status || "unavailable") as Freshness
            }
          />
          {result.data?.retrievedAt && (
            <small>
              {dataset?.id.startsWith("live-") ||
              dataset?.id === "river-quality"
                ? t("Last retrieval", "最後擷取")
                : t("Catalogue reference", "目錄參考日期")}
              {": "}
              {dataset?.id.startsWith("live-") ||
              dataset?.id === "river-quality"
                ? `${formatTime(result.data.retrievedAt)}${t(" (Taiwan time)", "（臺灣時間）")}`
                : result.data.retrievedAt.slice(0, 10)}
            </small>
          )}
        </div>
      </div>
      <ContinuousTabs
        id={tabId}
        label={t("Subject views", "專題檢視")}
        value={tab}
        onChange={setTab}
        items={[
          {
            value: "map" as const,
            label: (
              <>
                <MapPin size={16} />
                {t("Map & records", "地圖與紀錄")}
              </>
            ),
          },
          {
            value: "charts" as const,
            label: (
              <>
                <ChartNoAxesCombined size={16} />
                {t("Compare & charts", "比較與圖表")}
              </>
            ),
          },
          {
            value: "sources" as const,
            label: (
              <>
                <Info size={16} />
                {t("Sources & scope", "來源與範圍")}
              </>
            ),
          },
        ]}
      />
      <div
        role="tabpanel"
        id={`${tabId}-map-panel`}
        aria-labelledby={`${tabId}-map-tab`}
        hidden={tab !== "map"}
        className="atlas-tab-panel"
      >
        <div className="atlas-map-toolbar">
          {dataset?.raster ? (
            <span>
              {t(
                "Raster overview · nearest-neighbour display",
                "網格概覽・最近鄰呈現",
              )}
            </span>
          ) : (
            <label>
              {t("Map display", "地圖呈現")}
              <select
                aria-label={t("Map display", "地圖呈現")}
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "clusters" | "heatmap")
                }
              >
                <option value="clusters">
                  {t("Clusters / route geometry", "群聚／實際路線")}
                </option>
                <option value="heatmap">
                  {t("Included-record density", "收錄紀錄密度")}
                </option>
              </select>
            </label>
          )}
          <Link href={`/explore?layers=${dataset?.id || ""}`}>
            {t("Open central atlas", "開啟中央地圖")} ↗
          </Link>
        </div>
        <div className="atlas-map">
          {counties ? (
            <MapCanvas
              compact
              counties={counties}
              selectedCounty={filters.county}
              boundariesVisible
              aqi={[]}
              weather={[]}
              aqiVisible={false}
              weatherVisible={false}
              focusedObservation={null}
              aqiRetrievedAt={null}
              weatherRetrievedAt={null}
              language={language}
              resetToken={0}
              onSelect={(code) => change("county", code)}
              overlays={overlays}
              onViewport={onViewport}
              focusedAtlas={focusedAtlas}
              onAtlasSelect={(_, feature) => setSelected(feature)}
            />
          ) : (
            <div className="map-loading">
              {boundaryError ? (
                <button className="button secondary" onClick={retryBoundaries}>
                  {t("Retry official boundaries", "重試官方界線")}
                </button>
              ) : (
                t("Loading official county boundaries…", "載入官方縣市界線…")
              )}
            </div>
          )}
        </div>
        {dataset?.raster && (
          <div
            className="atlas-raster-legend"
            aria-label={t("Land-cover legend", "土地覆蓋圖例")}
          >
            {dataset.raster.legend.map((item) => (
              <span key={item.color}>
                <i style={{ background: item.color }} />
                {item.label[language]}
              </span>
            ))}
          </div>
        )}
        <p className="atlas-map-note">
          {dataset?.raster
            ? t(
                "The overview is generalized for the map. County statistics use original source pixels; selecting a county retains the full research raster as geographic context.",
                "地圖概覽經簡化；縣市統計使用原始像素。選取縣市後仍保留完整研究影像作地理參考。",
              )
            : t(
                "Clusters and heatmaps show included record counts, not abundance, incident risk or area coverage. Zoom to inspect a smaller area; large inventories are grouped for the map. The table retains original record identities.",
                "群聚及熱區呈現收錄紀錄數，並非族群數量、事件風險或面積覆蓋。縮放可檢視小範圍；大量盤點會於地圖彙整，列表仍保留原紀錄編號。",
              )}
        </p>
        {selected && dataset && (
          <article id="atlas-record-details" className="atlas-record-detail">
            <div className="atlas-detail-heading">
              <div>
                <span className="eyebrow">
                  {t("RECORD DETAILS", "紀錄詳情")}
                </span>
                <h2>
                  {language === "zh" && selected.properties.titleZh
                    ? selected.properties.titleZh
                    : selected.properties.title}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label={t("Close record details", "關閉紀錄詳情")}
                onClick={() => setSelected(null)}
              >
                <X size={19} />
              </button>
            </div>
            <dl>
              <div>
                <dt>{t("Original identifier", "原始編號")}</dt>
                <dd>{valueText(selected.properties.id)}</dd>
              </div>
              <div>
                <dt>{t("Source", "來源")}</dt>
                <dd>{selected.properties.sourceId}</dd>
              </div>
              <div>
                <dt>
                  {dataset.id === "river-quality"
                    ? t("Sampling date", "採樣日期")
                    : dataset.id.startsWith("live-")
                      ? t("Observation time", "觀測時間")
                      : t("Record date", "紀錄日期")}
                </dt>
                <dd>{valueText(selected.properties.date)}</dd>
              </div>
              {(dataset.id === "river-quality" ||
                dataset.id.startsWith("live-")) && (
                <div>
                  <dt>{t("Publication time", "發布時間")}</dt>
                  <dd>
                    {selected.properties.publishedAt
                      ? valueText(selected.properties.publishedAt)
                      : t(
                          "Not supplied by this source record",
                          "此來源紀錄未提供",
                        )}
                  </dd>
                </div>
              )}
              {dataset.fields.map((field) => (
                <div key={field.key}>
                  <dt>{field.label[language]}</dt>
                  <dd>
                    {valueText(selected.properties[field.key])}
                    {selected.properties[field.key] !== null &&
                    selected.properties[field.key] !== undefined &&
                    field.unit
                      ? ` ${field.unit}`
                      : ""}
                    {dataset.id === "river-quality" &&
                      selected.properties[field.key] === null &&
                      selected.properties[`${field.key}Raw`] && (
                        <small>
                          {t(" Source: ", " 來源：")}
                          {valueText(
                            selected.properties[`${field.key}Raw`],
                          )}{" "}
                          {valueText(selected.properties[`${field.key}Unit`])}
                        </small>
                      )}
                  </dd>
                </div>
              ))}
            </dl>
            {selected.properties.speciesId && (
              <Link
                className="text-link"
                href={`/wildlife/species/${encodeURIComponent(String(selected.properties.speciesId))}`}
              >
                {t("Species information & frequencies", "物種資料與頻度")} ↗
              </Link>
            )}
            {section === "culture" && !selected.properties.aggregated && (
              <Link
                className="text-link"
                href={`/culture/places/${encodeURIComponent(selected.properties.id)}`}
              >
                {t("Open place profile", "開啟地點資料")} ↗
              </Link>
            )}
            <p>{dataset.limitation[language]}</p>
            <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
              {t("Original source", "原始來源")} ↗ · {dataset.licence}
            </a>
          </article>
        )}
        <div className="atlas-records-heading">
          <h2>{t("Filtered records", "篩選後紀錄")}</h2>
          <div>
            {dataset && (
              <a
                className="button secondary"
                href={`/api/atlas/${dataset.id}?${new URLSearchParams([...params.entries()].filter(([key]) => key !== "bbox"))}&format=csv`}
              >
                <ArrowDownToLine size={15} />
                {t("Export CSV", "匯出 CSV")}
              </a>
            )}
            {dataset?.file && (
              <a className="text-link" href={dataset.file} download>
                {t("Full processed GeoJSON", "完整處理後 GeoJSON")} ↗
              </a>
            )}
          </div>
        </div>
        <p className="atlas-map-note">
          {t(
            "The record list follows the map viewport. CSV follows the non-viewport filters and includes up to 5,000 records; the full processed download preserves all published records. Missing measurements are shown as —.",
            "列表依目前地圖範圍顯示。CSV 依其他篩選條件匯出最多 5,000 筆，完整處理後下載則保留所有公開紀錄。缺少的測值以 — 顯示。",
          )}
        </p>
        <div className="atlas-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("Record", "紀錄")}</th>
                <th>{t("County", "縣市")}</th>
                <th>{t("Date / year", "日期／年份")}</th>
                <th>
                  {metricField
                    ? metricField.label[language]
                    : t("Category", "類別")}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.data?.records.map((record) => (
                <tr key={record.properties.id}>
                  <td>
                    <button
                      aria-label={`${t("View", "檢視")} ${record.properties.title}`}
                      className="atlas-record-button"
                      onClick={() => setSelected(record)}
                    >
                      {language === "zh" && record.properties.titleZh
                        ? record.properties.titleZh
                        : record.properties.title}
                      <ArrowUpRight size={13} />
                    </button>
                    {record.properties.speciesId && (
                      <Link
                        className="atlas-profile-link"
                        href={`/wildlife/species/${encodeURIComponent(String(record.properties.speciesId))}`}
                      >
                        {t("Species profile", "物種資料")}
                      </Link>
                    )}
                    {section === "culture" && (
                      <Link
                        className="atlas-profile-link"
                        href={`/culture/places/${encodeURIComponent(record.properties.id)}`}
                      >
                        {t("Place profile", "地點資料")}
                      </Link>
                    )}
                  </td>
                  <td>
                    {countyNames[record.properties.countyCode || ""] ||
                      t("Not assigned", "未指派")}
                  </td>
                  <td>{valueText(record.properties.date)}</td>
                  <td>
                    {valueText(
                      metric
                        ? record.properties[metric]
                        : record.properties.category,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result.isLoading && !result.data?.records.length && (
          <div className="atlas-empty">
            <Info />
            <h3>{t("No records in this selection", "此篩選範圍沒有紀錄")}</h3>
            <p>
              {dataset?.status === "unavailable"
                ? dataset.limitation[language]
                : t(
                    "Try a different dataset, county, date window or map extent. Missing coverage is not a zero measurement.",
                    "請嘗試其他資料集、縣市、日期或地圖範圍。缺少涵蓋資料並不代表測值為零。",
                  )}
            </p>
          </div>
        )}
        {result.data?.nextOffset !== null &&
          result.data?.nextOffset !== undefined && (
            <button
              className="button secondary"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  offset: result.data!.nextOffset!,
                }))
              }
            >
              {t("Next records", "下一批紀錄")}
            </button>
          )}
      </div>
      <div
        role="tabpanel"
        id={`${tabId}-charts-panel`}
        aria-labelledby={`${tabId}-charts-tab`}
        hidden={tab !== "charts"}
        className="atlas-tab-panel"
      >
        {tab === "charts" && result.data && (
          <AtlasCharts
            result={result.data}
            metric={metric}
            countyNames={countyNames}
          />
        )}
        {tab === "charts" && !result.data && (
          <p>
            {t(
              "Select an available dataset to inspect its actual coverage and charts.",
              "請選取可用資料集以檢視實際涵蓋範圍及圖表。",
            )}
          </p>
        )}
      </div>
      <div
        role="tabpanel"
        id={`${tabId}-sources-panel`}
        aria-labelledby={`${tabId}-sources-tab`}
        hidden={tab !== "sources"}
        className="atlas-tab-panel"
      >
        {dataset && (
          <article className="atlas-source-card">
            <span className="eyebrow">{dataset.sourceId}</span>
            <h2>{dataset.title[language]}</h2>
            <p>{dataset.description[language]}</p>
            <p>{dataset.limitation[language]}</p>
            <p>{dataset.licence}</p>
            <a
              className="text-link"
              href={dataset.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("Official source / research archive", "官方來源／研究典藏")} ↗
            </a>
            {dataset.statisticsFile && (
              <a className="text-link" href={dataset.statisticsFile} download>
                {t("Download source statistics", "下載來源統計")} ↗
              </a>
            )}
          </article>
        )}
        {catalogue.data?.resources
          .filter((resource) => resource.section === section)
          .map((resource) => (
            <article className="atlas-resource" key={resource.url}>
              <h3>
                <a href={resource.url} target="_blank" rel="noreferrer">
                  {resource.title[language]} ↗
                </a>
              </h3>
              <p>{resource.description[language]}</p>
            </article>
          ))}
        {section === "culture" && (
          <div className="atlas-resource">
            <h2>{t("Historical study library", "古道歷史研究館")}</h2>
            <p>
              {t(
                "These source studies contain no coordinates. They are information profiles, not invented map routes.",
                "這些來源研究未提供座標，僅建立資料頁，不捏造地圖路線。",
              )}
            </p>
            {studies.map((study) => (
              <Link
                key={study.id}
                href={`/culture/places/${encodeURIComponent(study.id)}`}
              >
                {language === "zh" ? study.titleZh : study.title} ↗
              </Link>
            ))}
          </div>
        )}
        {section === "wildlife" && (
          <div className="atlas-resource">
            <h2>{t("Future observations", "未來觀察資料")}</h2>
            <p>
              {t(
                "This release displays a historical, conservation-screened archive. New community observations can be submitted through the original Taiwan Roadkill Observation Network; EcoAtlas does not pretend to accept or publish submissions without a moderated storage service.",
                "本版呈現經保育篩選的歷史典藏。新的公民觀察可透過原臺灣路死觀察網通報；EcoAtlas 尚未建置審核儲存服務，不會假裝接收或發布投稿。",
              )}
            </p>
            <a
              className="button secondary"
              href="https://roadkill.tw/"
              target="_blank"
              rel="noreferrer"
            >
              {t("Open the observation network", "開啟路死觀察網")} ↗
            </a>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
