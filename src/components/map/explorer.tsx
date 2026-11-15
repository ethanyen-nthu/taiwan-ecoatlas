"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
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
  Wind,
  Thermometer,
  X,
} from "lucide-react";
import { layers, type LayerId } from "@/lib/layers";
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
export default function Explorer({ compact = false }: { compact?: boolean }) {
  const MapHeading = compact ? "h2" : "h1";
  const { t, language } = useLanguage();
  const panelId = useId();
  const { counties, boundaryError, retryBoundaries } = useCounties();
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [resetToken, setResetToken] = useState(0);
  const [visible, setVisible] = useState<LayerId[]>(["counties", "aqi"]),
    [panelOpen, setPanelOpen] = useState(!compact);
  const [tab, setTab] = useState<"layers" | "details">("layers"),
    [date, setDate] = useState("");
  const [focus, setFocus] = useState<{
    kind: ObservationKind;
    observation: Observation;
  } | null>(null);
  const aqi = useObservations("aqi"),
    weather = useObservations("weather");
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
  // Only small station datasets are retained in memory. Large future layers use viewport queries.
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
          <MapCanvas
            compact={compact}
            counties={counties}
            selectedCounty={selected}
            boundariesVisible={visible.includes("counties")}
            aqi={filteredAqi}
            weather={filteredWeather}
            aqiVisible={visible.includes("aqi")}
            weatherVisible={visible.includes("weather")}
            language={language}
            resetToken={resetToken}
            onSelect={(code) => {
              setFocus(null);
              setSelected(code);
            }}
            focusedObservation={focus}
            aqiRetrievedAt={aqi.data?.retrievedAt || null}
            weatherRetrievedAt={weather.data?.retrievedAt || null}
          />
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
        <div className="map-context">
          <span className="eyebrow">
            TAIWAN ECOATLAS <span className="live-dot" />
          </span>
          <MapHeading>
            {compact
              ? t("An island, connected.", "一座島嶼，彼此相連。")
              : t("Explore the island", "探索這座島嶼")}
          </MapHeading>
          <p>
            {t(
              "Environment. Ecology. People. Place.",
              "環境、生態、人與地方。",
            )}
          </p>
        </div>
        <div className="map-coordinate">
          23°42′ N &nbsp; 120°58′ E<br />
          <span>{t("TAIWAN & OFFSHORE ISLANDS", "臺灣與離島")}</span>
        </div>
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
                    onClick={() => {
                      const f = counties?.features.find((f) =>
                        inCounty(o, f.properties.COUNTYCODE, counties),
                      );
                      if (f) setSelected(f.properties.COUNTYCODE);
                      const kind = o.source === "aqi" ? "aqi" : "weather";
                      setVisible((v) => (v.includes(kind) ? v : [...v, kind]));
                      setFocus({ kind, observation: o });
                      setQuery("");
                    }}
                  >
                    <MapPin size={14} />
                    {o.station}
                  </button>
                ))}
              {!options.length &&
                ![
                  ...(aqi.data?.observations || []),
                  ...(weather.data?.observations || []),
                ].some((o) =>
                  o.station.toLowerCase().includes(query.toLowerCase()),
                ) && (
                  <p>
                    {t(
                      "No matching county or loaded station.",
                      "沒有符合的縣市或已載入測站。",
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
                      <span className="tab-count">{visible.length}</span>
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
                        ) : (
                          <Thermometer size={18} />
                        )}
                      </span>
                      <div className="layer-text">
                        <label htmlFor={`layer-${layer.id}`}>
                          {layer.name[language]}
                        </label>
                        <p>{layer.description[language]}</p>
                        {layer.id !== "counties" && (
                          <Status
                            loading={
                              layer.id === "aqi" ? aqi.loading : weather.loading
                            }
                            status={
                              (layer.id === "aqi" ? aqi.data : weather.data)
                                ?.status
                            }
                          />
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
                <details className="future-layers">
                  <summary>
                    <span>{t("More layers", "更多圖層")}</span>
                    <span>{t("8 not imported", "8 個尚未匯入")}</span>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="section-label upcoming-label">
                    <span>{t("ON THE HORIZON", "未來圖層")}</span>
                    <span>{t("Not imported", "尚未匯入")}</span>
                  </div>
                  {layers
                    .filter((l) => !l.available)
                    .map((layer) => (
                      <div className="layer-row future-layer" key={layer.id}>
                        <span
                          className="layer-dot"
                          style={{ background: layer.color }}
                        />
                        <div className="layer-text">
                          <span>{layer.name[language]}</span>
                          <p>
                            {layer.dateRange || layer.description[language]}
                          </p>
                        </div>
                        <span className="planned-mark">—</span>
                      </div>
                    ))}
                </details>
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
          <div className="insight-title">
            <span className="eyebrow">{t("REGIONAL VIEW", "區域檢視")}</span>
            <span className="outline-dot" />
          </div>
          <h2>{selectedName}</h2>
          <p>
            {county
              ? language === "en"
                ? county.properties.COUNTYNAME
                : county.properties.COUNTYENG
              : t(
                  "A shared landscape, many stories.",
                  "共同的地景，多元的故事。",
                )}
          </p>
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
          <div className="insight-notice">
            <Info size={14} />
            <p>
              {t(
                "Station counts reflect loaded reports within your filters, not all existing stations.",
                "測站數為篩選後已載入的報告數，不代表所有既有測站。",
              )}
            </p>
          </div>
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
        <div className="map-legend">
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
                  "Numbered circles group nearby stations; zoom in to see individual status colours.",
                  "數字圓圈聚合鄰近測站；放大可查看個別狀態顏色。",
                )}
              </p>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
