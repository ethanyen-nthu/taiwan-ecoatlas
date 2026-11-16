"use client";

import { ArrowUpRight, ChevronDown, Info } from "lucide-react";
import type {
  AtlasDataset,
  AtlasOverlay,
  AtlasSection,
} from "@/lib/atlas-types";
import {
  sectionColors,
  useWildlifeSpecies,
  type AtlasMapFilters,
} from "./atlas-hooks";
import { useLanguage } from "./providers";

const sections: AtlasSection[] = [
  "environment",
  "forests",
  "wildlife",
  "culture",
  "urban",
];

export function AtlasLayerControls({
  datasets,
  selected,
  onToggle,
  mode,
  onMode,
  filters,
  onFilters,
  loading,
  error,
  failedLayers,
  categories,
}: {
  datasets: AtlasDataset[];
  selected: string[];
  onToggle: (dataset: AtlasDataset) => void;
  mode: "clusters" | "heatmap";
  onMode: (mode: "clusters" | "heatmap") => void;
  filters: AtlasMapFilters;
  onFilters: (filters: AtlasMapFilters) => void;
  loading: boolean;
  error: boolean;
  failedLayers: string[];
  categories: string[];
}) {
  const { language, t } = useLanguage();
  const wildlife = datasets.some(
    (dataset) =>
      dataset.section === "wildlife" && selected.includes(dataset.id),
  );
  const species = useWildlifeSpecies(wildlife);
  const additional = datasets.filter(
    (dataset) => !["live-aqi", "live-weather"].includes(dataset.id),
  );
  const temporal = additional.some(
    (dataset) =>
      selected.includes(dataset.id) &&
      (dataset.dateRange !== null || dataset.id === "river-quality"),
  );
  const names = {
    environment: t("Environment", "環境"),
    forests: t("Forests", "森林"),
    wildlife: t("Wildlife observations", "野生動物觀察"),
    culture: t("Culture and communities", "文化與社群"),
    urban: t("Urban nature", "都市自然"),
  };
  return (
    <details className="future-layers">
      <summary>
        <span>{t("More layers", "更多圖層")}</span>
        <span>
          {t(
            `${additional.filter((dataset) => dataset.status === "available").length} available`,
            `${additional.filter((dataset) => dataset.status === "available").length} 個可用`,
          )}
        </span>
        <ChevronDown size={16} />
      </summary>
      {error && (
        <p className="panel-note" role="status">
          {t(
            "Additional layers could not be loaded. Try changing a filter or reloading the page.",
            "無法載入其他圖層，請調整篩選條件或重新載入頁面。",
          )}
        </p>
      )}
      {loading && (
        <p className="small muted" role="status">
          {t("Updating selected map layers…", "更新所選地圖圖層…")}
        </p>
      )}
      {failedLayers.length > 0 && (
        <p className="panel-note" role="status">
          {t(
            "Some selected sources are unavailable: ",
            "部分已選來源暫時無法使用：",
          )}
          {failedLayers
            .map(
              (id) =>
                datasets.find((dataset) => dataset.id === id)?.title[
                  language
                ] || id,
            )
            .join(", ")}
        </p>
      )}
      {sections.map((section) => {
        const group = additional.filter(
          (dataset) => dataset.section === section,
        );
        if (!group.length) return null;
        return (
          <div key={section}>
            <div className="section-label">
              <span>{names[section]}</span>
            </div>
            {group.map((dataset) => (
              <div className="layer-row" key={dataset.id}>
                <span
                  className="layer-dot"
                  style={{ background: sectionColors[section], flexShrink: 0 }}
                />
                <div className="layer-text">
                  <label
                    htmlFor={
                      dataset.status === "available"
                        ? `atlas-layer-${dataset.id}`
                        : undefined
                    }
                  >
                    {dataset.title[language]}
                  </label>
                  <p>{dataset.description[language]}</p>
                  <details className="small" style={{ marginTop: 8 }}>
                    <summary>
                      {t("Source, coverage and limits", "來源、涵蓋與限制")}
                    </summary>
                    <p>{dataset.limitation[language]}</p>
                    <p>
                      {dataset.dateRange
                        ? `${dataset.dateRange[0]} — ${dataset.dateRange[1]}`
                        : t(
                            "No observation date range supplied",
                            "未提供觀測日期範圍",
                          )}
                    </p>
                    <p>
                      {dataset.recordCount > 0
                        ? t(
                            `${dataset.recordCount.toLocaleString("en")} published records`,
                            `${dataset.recordCount.toLocaleString("zh-TW")} 筆公開紀錄`,
                          )
                        : dataset.status === "available"
                          ? t("Reports loaded on request", "依請求載入報告")
                          : t(
                              "Source unavailable; no map data invented",
                              "來源無法取得，不虛構地圖資料",
                            )}
                    </p>
                    <p>
                      <a
                        href={dataset.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("Original source", "原始來源")}{" "}
                        <ArrowUpRight size={12} />
                      </a>{" "}
                      ·{" "}
                      {dataset.licenceUrl ? (
                        <a
                          href={dataset.licenceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {dataset.licence}
                        </a>
                      ) : (
                        dataset.licence
                      )}
                    </p>
                  </details>
                </div>
                {dataset.status === "available" ? (
                  <button
                    id={`atlas-layer-${dataset.id}`}
                    type="button"
                    role="switch"
                    aria-label={dataset.title[language]}
                    aria-checked={selected.includes(dataset.id)}
                    className={`toggle ${selected.includes(dataset.id) ? "on" : ""}`}
                    onClick={() => onToggle(dataset)}
                  >
                    <span />
                  </button>
                ) : (
                  <span
                    className="planned-mark"
                    aria-label={t("Source unavailable", "來源無法取得")}
                  >
                    —
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
      {selected.length > 0 && (
        <>
          <label className="county-select" style={{ margin: "16px 0" }}>
            <span className="small">{t("Point display", "點位呈現")}</span>
            <select
              aria-label={t("Additional point-layer style", "其他點位圖層樣式")}
              value={mode}
              onChange={(event) =>
                onMode(event.target.value as "clusters" | "heatmap")
              }
            >
              <option value="clusters">{t("Clusters", "聚合點")}</option>
              <option value="heatmap">
                {t("Record-density heatmap", "紀錄密度熱圖")}
              </option>
            </select>
          </label>
          <label className="county-select" style={{ margin: "12px 0" }}>
            <select
              aria-label={t("Additional-layer category", "其他圖層類別")}
              value={filters.category || ""}
              onChange={(event) =>
                onFilters({ ...filters, category: event.target.value })
              }
            >
              <option value="">
                {t("All source categories", "全部來源類別")}
              </option>
              {[
                ...new Set([
                  ...categories,
                  ...(filters.category ? [filters.category] : []),
                ]),
              ]
                .sort()
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </label>
          <p className="small muted">
            {t(
              "Heatmaps show source-record density, not ecological abundance or risk. Raster classifications keep their own legend.",
              "熱圖呈現來源紀錄密度，並非生物數量或風險；柵格分類使用各自圖例。",
            )}
          </p>
        </>
      )}
      {temporal && (
        <fieldset
          style={{
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: 12,
            margin: "16px 0",
            minWidth: 0,
          }}
        >
          <legend className="small">
            {t("Historical record filters", "歷史紀錄篩選")}
          </legend>
          <div
            className="panel-date-filter"
            style={{ padding: 0, display: "grid", gap: 10 }}
          >
            {(["start", "end"] as const).map((key) => (
              <label key={key}>
                {key === "start"
                  ? t("Record date from", "紀錄起日")
                  : t("Record date through", "紀錄迄日")}
                <input
                  type="date"
                  value={filters[key] || ""}
                  onChange={(event) =>
                    onFilters({ ...filters, [key]: event.target.value })
                  }
                />
              </label>
            ))}
          </div>
          {filters.start && filters.end && filters.start > filters.end && (
            <p className="small" role="alert">
              {t(
                "The start must be on or before the end.",
                "起日不可晚於迄日。",
              )}
            </p>
          )}
          {wildlife && (
            <label className="county-select" style={{ margin: "12px 0" }}>
              <select
                aria-label={t("Wildlife species", "野生動物物種")}
                value={filters.species || ""}
                onChange={(event) =>
                  onFilters({ ...filters, species: event.target.value })
                }
              >
                <option value="">
                  {t("All published species", "全部公開物種")}
                </option>
                {species.data?.species.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (
                    {item.count.toLocaleString(
                      language === "en" ? "en" : "zh-TW",
                    )}
                    )
                  </option>
                ))}
              </select>
            </label>
          )}
          {wildlife && species.error && (
            <p className="small muted">
              {t("The species index is unavailable.", "物種索引無法取得。")}
            </p>
          )}
          <p className="small muted">
            {t(
              "Dates apply to dated sources, including river samples and tree record dates. Forest dates refer to the classification year. Undated village, trail and park layers remain visible. Species filters apply only to wildlife; its public points are generalized 10 km grid centres, not discovery locations.",
              "日期篩選適用有日期的來源，包含河川採樣與樹木紀錄日期；森林日期指分類年份。未提供日期的部落、步道與公園圖層維持顯示。物種僅篩選野生動物；其公開點位為概化後的 10 公里網格中心，並非發現地點。",
            )}
          </p>
        </fieldset>
      )}
      {!datasets.length && !loading && !error && (
        <p className="panel-note">
          <Info size={14} />
          {t(
            "No additional datasets are currently available.",
            "目前沒有其他可用資料集。",
          )}
        </p>
      )}
    </details>
  );
}

export function AtlasMapLegend({ overlays }: { overlays: AtlasOverlay[] }) {
  const { language, t } = useLanguage();
  return (
    <>
      {overlays.map((overlay) => (
        <details key={overlay.dataset.id}>
          <summary>
            <span
              className="legend-dot"
              style={{ background: overlay.color }}
            />
            {overlay.dataset.title[language]}
          </summary>
          {overlay.dataset.raster?.legend.map((item) => (
            <div key={item.label.en}>
              <span className="legend-dot" style={{ background: item.color }} />
              {item.label[language]}
            </div>
          ))}
          <p>
            {overlay.dataset.raster
              ? t(
                  "Classification overview at its full source extent; source no-data remains transparent. County and text filters select summary records, not raster pixels.",
                  "分類概覽維持來源完整範圍；缺資料處透明。縣市與文字篩選僅選取摘要紀錄，不裁切柵格像素。",
                )
              : overlay.mode === "clusters"
                ? t(
                    "Numbered clusters count matching records. Coincident generalized points may represent multiple records.",
                    "數字聚合點計算符合條件的紀錄；重疊概化點可能代表多筆紀錄。",
                  )
                : t(
                    "Heatmap weights are matching record counts, not population or risk.",
                    "熱圖權重為符合條件的紀錄數，並非族群數量或風險。",
                  )}
          </p>
          <p>
            <a
              href={overlay.dataset.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {overlay.dataset.sourceId}
            </a>{" "}
            · {overlay.dataset.licence}
          </p>
        </details>
      ))}
    </>
  );
}
