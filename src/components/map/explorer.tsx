"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers3,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Tornado,
  Wind,
  Thermometer,
  X,
} from "lucide-react";
import { layers, type LayerId } from "@/lib/layers";
import type { AtlasDataset, AtlasFeature } from "@/lib/atlas-types";
import { inCounty } from "@/lib/geo";
import { aqiColours, aqiStatusEnglish } from "@/lib/transform";
import type {
  Counties,
  DatasetResponse,
  Observation,
  ObservationKind,
} from "@/lib/types";
import { sourceById } from "@/lib/sources";
import { useLanguage, useObservations, useCounties } from "../providers";
import { ContinuousTabs } from "../watermelon/continuous-tabs";
import { Status, useFormatTime } from "../status";
import {
  useAtlasCatalogue,
  useAtlasOverlays,
  type AtlasMapFilters,
} from "../atlas-hooks";
import { AtlasLayerControls, AtlasMapLegend } from "../atlas-layer-controls";
import {
  HazardDetails,
  HazardLegend,
  HazardRowStatus,
} from "../hazards/hazard-status";
import { useHazards } from "../hazards/use-hazards";
import { LazyBoundary, MissingPiece } from "../pwa/lazy-boundary";
import type { HazardTarget } from "./hazard-layers";

const hazardLayerIds = ["earthquakes", "typhoon"] as const;

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span className="loading-ring" />
      Loading map / 載入地圖
    </div>
  ),
});
function filterObservations(
  data: DatasetResponse | null,
  selected: string,
  counties: Counties | null,
  date: string,
) {
  return (
    data?.observations.filter(
      (o) =>
        (!selected || (!!counties && inCounty(o, selected, counties))) &&
        (!date ||
          new Date(Date.parse(o.observedAt) + 8 * 3600_000)
            .toISOString()
            .slice(0, 10) === date),
    ) || []
  );
}
export default function Explorer({
  compact = false,
  island = false,
  initialLayers = [],
}: {
  compact?: boolean;
  island?: boolean;
  initialLayers?: string[];
}) {
  const { t, language } = useLanguage();
  const panelId = useId();
  const { counties, boundaryError, retryBoundaries } = useCounties();
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [resetToken, setResetToken] = useState(0);
  const [visible, setVisible] = useState<LayerId[]>(() => [
      ...(initialLayers.includes("live-weather")
        ? initialLayers.includes("live-aqi")
          ? (["counties", "aqi", "weather"] as const)
          : (["counties", "weather"] as const)
        : (["counties", "aqi"] as const)),
      ...hazardLayerIds.filter((id) => initialLayers.includes(id)),
    ]),
    [panelOpen, setPanelOpen] = useState(!compact);
  const [tab, setTab] = useState<"layers" | "details">("layers"),
    [date, setDate] = useState("");
  const [focus, setFocus] = useState<{
    kind: ObservationKind;
    observation: Observation;
  } | null>(null);
  const [atlasIds, setAtlasIds] = useState<string[]>(
    initialLayers.filter(
      (id) => !["live-aqi", "live-weather", ...hazardLayerIds].includes(id),
    ),
  );
  const [atlasMode, setAtlasMode] = useState<"points" | "density">("points");
  const [atlasFilters, setAtlasFilters] = useState<AtlasMapFilters>({});
  const [atlasFocus, setAtlasFocus] = useState<{
    datasetId: string;
    feature: AtlasFeature;
  } | null>(null);
  const [viewport, setViewport] = useState<{
    bbox: [number, number, number, number];
    zoom: number;
  } | null>(null);
  const catalogue = useAtlasCatalogue();
  const atlas = useAtlasOverlays(atlasIds, viewport, selected, atlasMode, {
    ...atlasFilters,
    q: query.trim(),
  });
  const atlasMatches = query.trim()
    ? atlas.overlays
        .flatMap((overlay) =>
          overlay.data.features
            .filter(
              (feature) =>
                !feature.properties.aggregated &&
                [
                  feature.properties.title,
                  feature.properties.titleZh,
                  feature.properties.species,
                  feature.properties.scientificName,
                ].some((value) =>
                  String(value || "")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ),
            )
            .map((feature) => ({ dataset: overlay.dataset, feature })),
        )
        .slice(0, 8)
    : [];
  const toggleAtlas = (dataset: AtlasDataset) => {
    setAtlasFocus(null);
    setAtlasIds((current) =>
      current.includes(dataset.id)
        ? current.filter((id) => id !== dataset.id)
        : [
            ...current.filter(
              (id) =>
                !dataset.raster ||
                !catalogue.data?.datasets.find((item) => item.id === id)
                  ?.raster,
            ),
            dataset.id,
          ],
    );
  };
  const aqi = useObservations("aqi"),
    weather = useObservations("weather");
  const hazards = useHazards();
  const [hazardFocus, setHazardFocus] = useState<HazardTarget | null>(null);
  const formatTime = useFormatTime();
  const county = counties?.features.find(
    (f) => f.properties.COUNTYCODE === selected,
  );
  const selectedName = county
    ? language === "en"
      ? county.properties.COUNTYENG
      : county.properties.COUNTYNAME
    : t("All Taiwan", "全臺灣");
  const options =
    counties?.features.filter((f) =>
      `${f.properties.COUNTYNAME} ${f.properties.COUNTYENG}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) || [];
  // Native station lists stay small; catalogue layers use bounded viewport queries.
  const filteredAqi = useMemo(
    () => filterObservations(aqi.data, selected, counties, date),
    [aqi.data, selected, counties, date],
  );
  const filteredWeather = useMemo(
    () => filterObservations(weather.data, selected, counties, date),
    [weather.data, selected, counties, date],
  );
  const toggle = (id: LayerId) =>
    setVisible((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  const reset = () => {
    setFocus(null);
    setAtlasFocus(null);
    setAtlasFilters({});
    setSelected("");
    setQuery("");
    setDate("");
    setResetToken((v) => v + 1);
  };
  return (
    <section
      className={`explorer ${compact ? "compact-explorer" : ""}`}
      aria-label={t("Geographical explorer", "地理探索器")}
    >
      <div className="explorer-map">
        {counties ? (
          <LazyBoundary fallback={<MissingPiece kind="map" />}>
            <MapCanvas
              compact={compact}
              island={island}
              counties={counties}
              selectedCounty={selected}
              boundariesVisible={visible.includes("counties")}
              aqi={filteredAqi}
              weather={filteredWeather}
              aqiVisible={visible.includes("aqi")}
              weatherVisible={visible.includes("weather")}
              hazards={hazards.data}
              quakesVisible={visible.includes("earthquakes")}
              typhoonVisible={visible.includes("typhoon")}
              focusedHazard={hazardFocus}
              language={language}
              resetToken={resetToken}
              onSelect={(code) => {
                setFocus(null);
                setAtlasFocus(null);
                setSelected(code);
              }}
              focusedObservation={focus}
              overlays={atlas.overlays}
              onViewport={setViewport}
              focusedAtlas={atlasFocus}
              onAtlasSelect={() => setFocus(null)}
              aqiRetrievedAt={aqi.data?.retrievedAt || null}
              weatherRetrievedAt={weather.data?.retrievedAt || null}
            />
          </LazyBoundary>
        ) : (
          <div className="map-loading">
            {boundaryError ? (
              <>
                <Info />
                <p>
                  {t(
                    "Official county boundaries could not be loaded.",
                    "無法載入官方縣市界線。",
                  )}
                </p>
                <button className="button secondary" onClick={retryBoundaries}>
                  {t("Retry", "重試")}
                </button>
              </>
            ) : (
              <>
                <span className="loading-ring" />
                {t("Loading official geography…", "載入官方地理資料…")}
              </>
            )}
          </div>
        )}
        {!compact && (
          <div className="map-context">
            <h1>{t("Explore the island", "探索這座島嶼")}</h1>
          </div>
        )}
        {compact && (
          <Link className="map-open button" href="/explore">
            {t("Open interactive map", "開啟互動地圖")}
            <ArrowUpRight size={17} />
          </Link>
        )}
        {!compact && (
          <>
            <button
              className="panel-toggle icon-button"
              onClick={() => setPanelOpen(!panelOpen)}
              aria-label={t("Toggle layers panel", "切換圖層面板")}
              aria-expanded={panelOpen}
            >
              {panelOpen ? <ChevronLeft size={18} /> : <Layers3 size={18} />}
            </button>
            <div className="map-bottom">
              <span>
                <span className="live-dot" />
                {t("Official geography", "官方地理資料")}
              </span>
              <span>WGS84 · EPSG:4326</span>
            </div>
          </>
        )}
      </div>
      {!compact && (
        <aside
          className={`explorer-panel ${panelOpen ? "" : "collapsed"}`}
          inert={!panelOpen}
          aria-hidden={!panelOpen}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {t("YOUR FIELD GUIDE", "你的探索指南")}
              </span>
              <h2>{t("Map explorer", "地圖探索")}</h2>
            </div>
            <Layers3 size={22} strokeWidth={1.5} />
          </div>
          <div className="panel-search">
            <Search size={17} />
            <input
              aria-label={t(
                "Search counties or station names",
                "搜尋縣市或測站名稱",
              )}
              placeholder={t("Search county or station…", "搜尋縣市或測站…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                onClick={() => setQuery("")}
                aria-label={t("Clear search", "清除搜尋")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {query && (
            <div className="search-results">
              {options.map((f) => (
                <button
                  key={f.properties.COUNTYCODE}
                  onClick={() => {
                    setFocus(null);
                    setAtlasFocus(null);
                    setSelected(f.properties.COUNTYCODE);
                    setQuery("");
                  }}
                >
                  <MapPin size={14} />
                  {language === "en"
                    ? f.properties.COUNTYENG
                    : f.properties.COUNTYNAME}
                  <ChevronRight size={14} />
                </button>
              ))}
              {[
                ...(aqi.data?.observations || []),
                ...(weather.data?.observations || []),
              ]
                .filter((o) =>
                  o.station.toLowerCase().includes(query.toLowerCase()),
                )
                .slice(0, 8)
                .map((o) => (
                  <button
                    key={`${o.source}-${o.id}`}
                    aria-label={`${o.station} · ${o.source === "aqi" ? t("Air quality", "空氣品質") : t("Weather", "氣象")}`}
                    onClick={() => {
                      const f = counties?.features.find((f) =>
                        inCounty(o, f.properties.COUNTYCODE, counties),
                      );
                      if (f) setSelected(f.properties.COUNTYCODE);
                      const kind = o.source === "aqi" ? "aqi" : "weather";
                      setVisible((v) => (v.includes(kind) ? v : [...v, kind]));
                      setFocus({ kind, observation: o });
                      setAtlasFocus(null);
                      setQuery("");
                    }}
                  >
                    <MapPin size={14} />
                    <span>
                      {o.station}
                      <small>
                        {o.source === "aqi"
                          ? t("Air quality", "空氣品質")
                          : t("Weather", "氣象")}
                      </small>
                    </span>
                  </button>
                ))}
              {atlasMatches.map(({ dataset, feature }) => (
                <button
                  key={`${dataset.id}-${feature.properties.id}`}
                  onClick={() => {
                    setFocus(null);
                    setAtlasFocus({ datasetId: dataset.id, feature });
                    setQuery("");
                  }}
                >
                  <MapPin size={14} />
                  <span>
                    {language === "zh"
                      ? feature.properties.titleZh || feature.properties.title
                      : feature.properties.title}
                    <small>
                      {dataset.title[language]} ·{" "}
                      {t("current view", "目前視窗")}
                    </small>
                  </span>
                </button>
              ))}
              {!options.length &&
                !atlasMatches.length &&
                ![
                  ...(aqi.data?.observations || []),
                  ...(weather.data?.observations || []),
                ].some((o) =>
                  o.station.toLowerCase().includes(query.toLowerCase()),
                ) && (
                  <p>
                    {t(
                      "No matching county, loaded station or selected-layer feature in this view.",
                      "此視窗沒有符合的縣市、已載入測站或已選圖層地物。",
                    )}
                  </p>
                )}
            </div>
          )}
          <label className="county-select">
            <MapPin size={16} />
            <select
              aria-label={t("Select county", "選擇縣市")}
              value={selected}
              onChange={(e) => {
                setFocus(null);
                setAtlasFocus(null);
                setSelected(e.target.value);
              }}
            >
              <option value="">
                {t("All Taiwan & offshore islands", "全臺灣與離島")}
              </option>
              {counties?.features.map((f) => (
                <option
                  key={f.properties.COUNTYCODE}
                  value={f.properties.COUNTYCODE}
                >
                  {language === "en"
                    ? f.properties.COUNTYENG
                    : f.properties.COUNTYNAME}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <div className="panel-tabs">
            <ContinuousTabs
              id={panelId}
              label={t("Explorer views", "探索檢視")}
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: "layers" as const,
                  label: (
                    <>
                      <Layers3 size={16} />
                      {t("Layers", "圖層")}
                      <span className="tab-count">
                        {visible.length + atlasIds.length}
                      </span>
                    </>
                  ),
                },
                {
                  value: "details" as const,
                  label: (
                    <>
                      <Info size={16} />
                      {t("Data details", "資料詳情")}
                    </>
                  ),
                },
              ]}
            />
          </div>
          <div
            hidden
            role="tabpanel"
            id={`${panelId}-${tab === "layers" ? "details" : "layers"}-panel`}
            aria-labelledby={`${panelId}-${tab === "layers" ? "details" : "layers"}-tab`}
          />
          <div className="panel-date-filter">
            <label>
              {t("Filter latest reports by date", "依日期篩選最新報告")}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            {date && (
              <button onClick={() => setDate("")}>{t("Clear", "清除")}</button>
            )}
          </div>
          <div
            className="panel-scroll"
            role="tabpanel"
            id={`${panelId}-${tab}-panel`}
            aria-labelledby={`${panelId}-${tab}-tab`}
            tabIndex={0}
          >
            {tab === "layers" ? (
              <>
                <div className="section-label">
                  <span>{t("AVAILABLE LAYERS", "可用圖層")}</span>
                  <SlidersHorizontal size={13} />
                </div>
                {layers
                  .filter((l) => l.available)
                  .map((layer) => (
                    <div className="layer-row" key={layer.id}>
                      <span
                        className="layer-symbol"
                        style={{
                          background: `${layer.color}16`,
                          color: layer.color,
                        }}
                      >
                        {layer.id === "counties" ? (
                          <Layers3 size={18} />
                        ) : layer.id === "aqi" ? (
                          <Wind size={18} />
                        ) : layer.id === "earthquakes" ? (
                          <Activity size={18} />
                        ) : layer.id === "typhoon" ? (
                          <Tornado size={18} />
                        ) : (
                          <Thermometer size={18} />
                        )}
                      </span>
                      <div className="layer-text">
                        <label htmlFor={`layer-${layer.id}`}>
                          {layer.name[language]}
                        </label>
                        <p>{layer.description[language]}</p>
                        {layer.id === "earthquakes" ||
                        layer.id === "typhoon" ? (
                          <HazardRowStatus
                            kind={layer.id}
                            hazards={hazards}
                            listed={visible.includes(layer.id)}
                            onPick={(target) => {
                              setFocus(null);
                              setAtlasFocus(null);
                              setHazardFocus({ ...target });
                            }}
                          />
                        ) : (
                          layer.id !== "counties" && (
                            <Status
                              loading={
                                layer.id === "aqi"
                                  ? aqi.loading
                                  : weather.loading
                              }
                              status={
                                (layer.id === "aqi" ? aqi.data : weather.data)
                                  ?.status
                              }
                            />
                          )
                        )}
                      </div>
                      <button
                        id={`layer-${layer.id}`}
                        role="switch"
                        aria-checked={visible.includes(layer.id)}
                        aria-label={layer.name[language]}
                        className={`toggle ${visible.includes(layer.id) ? "on" : ""}`}
                        onClick={() => toggle(layer.id)}
                      >
                        <span />
                      </button>
                    </div>
                  ))}
                <AtlasLayerControls
                  datasets={catalogue.data?.datasets || []}
                  selected={atlasIds}
                  onToggle={toggleAtlas}
                  mode={atlasMode}
                  onMode={setAtlasMode}
                  filters={atlasFilters}
                  onFilters={(next) => {
                    setAtlasFocus(null);
                    setAtlasFilters(next);
                  }}
                  loading={catalogue.isLoading || atlas.isLoading}
                  error={!!catalogue.error || !!atlas.error}
                  failedLayers={atlas.failedLayers}
                  categories={atlas.layerDetails
                    .flatMap((layer) => layer.categories || [])
                    .map((category) => category.name)}
                />
                <div className="panel-note">
                  <Info size={15} />
                  <p>
                    {t(
                      "Every layer has its own coverage and update cycle. Unavailable measurements are never filled in.",
                      "每個圖層有各自的範圍與更新週期，不會填造缺少的測值。",
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="section-label">{selectedName}</div>
                {[aqi, weather].map((result, index) => {
                  const kind = index === 0 ? "aqi" : "weather",
                    source = sourceById(kind);
                  return (
                    <div className="data-detail" key={kind}>
                      <h3>{source.name[language]}</h3>
                      <Status
                        status={result.data?.status}
                        loading={result.loading}
                      />
                      <dl>
                        <dt>{t("Observation", "觀測時間")}</dt>
                        <dd>{formatTime(result.data?.lastObservationAt)}</dd>
                        <dt>{t("Publication", "發布時間")}</dt>
                        <dd>{formatTime(result.data?.publishedAt)}</dd>
                        <dt>
                          {t("Last successful retrieval", "最後成功擷取")}
                        </dt>
                        <dd>{formatTime(result.data?.retrievedAt)}</dd>
                        <dt>{t("Excluded / duplicates", "排除／重複")}</dt>
                        <dd>
                          {result.data
                            ? `${result.data.excluded} / ${result.data.duplicates}`
                            : "—"}
                        </dd>
                        <dt>{t("Licence", "授權")}</dt>
                        <dd>
                          {t(
                            "Open Government Data License 1.0",
                            "政府資料開放授權條款第 1 版",
                          )}
                        </dd>
                      </dl>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.agency[language]}
                        <ArrowUpRight size={13} />
                      </a>
                    </div>
                  );
                })}
                {atlas.overlays.map((overlay) => (
                  <div className="data-detail" key={overlay.dataset.id}>
                    <h3>{overlay.dataset.title[language]}</h3>
                    <p className="small muted">
                      {overlay.dataset.limitation[language]}
                    </p>
                    <dl>
                      <dt>{t("Source", "來源")}</dt>
                      <dd>{overlay.dataset.sourceId}</dd>
                      <dt>{t("Date coverage", "日期涵蓋")}</dt>
                      <dd>
                        {overlay.dataset.dateRange?.join(" — ") ||
                          t("Not supplied", "未提供")}
                      </dd>
                      <dt>{t("Licence", "授權")}</dt>
                      <dd>{overlay.dataset.licence}</dd>
                    </dl>
                    <a
                      href={overlay.dataset.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("Original source", "原始來源")}
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                ))}
                <HazardDetails hazards={hazards} />
                <p className="small muted">
                  {t(
                    "All displayed times use Asia/Taipei (UTC+8). Freshness applies to the latest report; inspect each station’s own timestamp.",
                    "所有時間均為臺北時間（UTC+8）。整體新鮮度以最新紀錄判定，請另確認各測站的時間。",
                  )}
                </p>
              </>
            )}
          </div>
          <div className="panel-footer">
            <button onClick={reset}>
              <RefreshCw size={14} />
              {t("Reset view", "重設檢視")}
            </button>
            <Link href="/sources">
              {t("Source registry", "來源登錄")}
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>
      )}
      {!compact && (
        <aside className="map-insight">
          <h2>{selectedName}</h2>
          {county && (
            <p>
              {language === "en"
                ? county.properties.COUNTYNAME
                : county.properties.COUNTYENG}
            </p>
          )}
          {aqi.data?.status === "not-configured" &&
          weather.data?.status === "not-configured" ? null : (
            <>
              <div className="insight-metrics">
                <div>
                  <Wind size={16} />
                  <strong>
                    {aqi.data?.status === "not-configured" || !aqi.data
                      ? "—"
                      : filteredAqi.length}
                  </strong>
                  <span>{t("AQI stations", "空品測站")}</span>
                </div>
                <div>
                  <Thermometer size={16} />
                  <strong>
                    {weather.data?.status === "not-configured" || !weather.data
                      ? "—"
                      : filteredWeather.length}
                  </strong>
                  <span>{t("Weather stations", "氣象測站")}</span>
                </div>
              </div>
              <p className="insight-note">
                {t(
                  "Counts are loaded reports within your filters, not every station.",
                  "數字為篩選後已載入的報告數，非所有測站。",
                )}
              </p>
            </>
          )}
          <details className="time-filter">
            <summary>
              <Settings2 size={14} />
              {t("Observation date", "觀測日期")}
            </summary>
            <label>
              {t(
                "Filter latest reports · Taiwan date",
                "篩選最新報告・臺灣日期",
              )}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            {date && (
              <button onClick={() => setDate("")}>
                {t("Clear date", "清除日期")}
              </button>
            )}
            <p>
              {t(
                "Only AQI and weather are affected. Historical observations are not yet stored.",
                "僅影響空品及氣象。尚未儲存歷史觀測。",
              )}
            </p>
          </details>
          {((!aqi.loading && aqi.data?.status === "not-configured") ||
            (!weather.loading &&
              weather.data?.status === "not-configured")) && (
            <Link className="configure-link" href="/sources">
              {t("Observations need configuration", "觀測來源需要設定")}
              <ArrowUpRight size={14} />
            </Link>
          )}
        </aside>
      )}
      {!compact && (
        <div
          className="map-legend"
          style={{ maxHeight: "min(45vh, 380px)", overflowY: "auto" }}
        >
          <span className="eyebrow">{t("MAP KEY", "圖例")}</span>
          {visible.includes("counties") && (
            <div>
              <span className="legend-boundary" />
              {t("Official county boundary", "官方縣市界線")}
            </div>
          )}
          {visible.includes("weather") && (
            <div>
              <span className="legend-dot weather" />
              {t("Weather station", "氣象測站")}
            </div>
          )}
          <AtlasMapLegend overlays={atlas.overlays} />
          {/* A key only for what is drawn: with no report or no tracked
              storm there is nothing on the map for it to explain. */}
          <HazardLegend
            quakes={
              visible.includes("earthquakes") &&
              (hazards.data?.earthquakes.events.length ?? 0) > 0
            }
            typhoon={
              visible.includes("typhoon") &&
              (hazards.data?.typhoon.cyclones.length ?? 0) > 0
            }
          />
          {visible.includes("aqi") && (
            <details>
              <summary>
                <span className="legend-dot air" />
                {t("Official AQI status", "官方 AQI 狀態")}
              </summary>
              {Object.entries(aqiColours).map(([label, color]) => (
                <div key={label}>
                  <span className="legend-dot" style={{ background: color }} />
                  {language === "en" ? aqiStatusEnglish[label] : label}
                </div>
              ))}
              <div>
                <span
                  className="legend-dot"
                  style={{ background: "#7c868d" }}
                />
                {t("Status unavailable", "狀態無資料")}
              </div>
              <p>
                {t(
                  "Each circle is one station, coloured by its own official AQI status.",
                  "每個圓圈代表一個測站，顏色為其官方 AQI 狀態。",
                )}
              </p>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
