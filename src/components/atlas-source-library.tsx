"use client";

import { ArrowDownToLine, ArrowUpRight, RefreshCw } from "lucide-react";
import { useAtlasCatalogue } from "./atlas-hooks";
import { useLanguage } from "./providers";
import styles from "./atlas-profile.module.css";

const assetUrl = (value: string) =>
  value.startsWith("/") ? value : `/${value}`;

export function AtlasSourceLibrary() {
  const { data, error, isLoading, mutate } = useAtlasCatalogue();
  const { t, language } = useLanguage();
  const sections = {
    environment: t("Environment", "環境"),
    forests: t("Forests", "森林"),
    wildlife: t("Wildlife", "野生動物"),
    culture: t("Culture", "文化"),
    urban: t("Urban ecology", "都市生態"),
  };
  return (
    <section
      id="atlas-source-library"
      className={styles.library}
      aria-labelledby="atlas-source-library-title"
    >
      <div className={styles.libraryHeading}>
        <span className="eyebrow">
          {t("IMPORTED EDITIONS & COVERAGE", "匯入版本與涵蓋範圍")}
        </span>
        <h2 id="atlas-source-library-title">
          {t("Atlas source library", "地圖資料來源館")}
        </h2>
        <p>
          {t(
            "Inspect the actual imported editions, source identifiers, licences and limits. Processed map geometry and statistical summaries are downloads of this platform's transformations; raster county summaries are not raw satellite pixels.",
            "查閱實際匯入版本、來源編號、授權與限制。處理後地圖幾何及統計摘要為本平台轉換成果；衛星縣市摘要並非原始像元。",
          )}
        </p>
      </div>
      {isLoading && (
        <p role="status">{t("Loading source catalogue…", "載入來源目錄中…")}</p>
      )}
      {error && (
        <div role="alert">
          <p>
            {t(
              "The imported source catalogue could not be loaded.",
              "無法載入已匯入來源目錄。",
            )}
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => void mutate()}
          >
            <RefreshCw size={14} />
            {t("Try again", "重試")}
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="source-list">
            {data.datasets.map((dataset) => (
              <article className="source-card" key={dataset.id}>
                <div className="source-card-top">
                  <div>
                    <span className="eyebrow">{sections[dataset.section]}</span>
                    <h2>{dataset.title[language]}</h2>
                    <code>{dataset.sourceId}</code>
                  </div>
                  <span
                    className={`source-state ${dataset.status === "available" ? "verified" : ""}`}
                  >
                    {dataset.status === "available"
                      ? dataset.file || dataset.raster
                        ? t("Imported edition", "已匯入版本")
                        : t("API adapter", "API 介接")
                      : t("Unavailable", "尚無可用資料")}
                  </span>
                </div>
                <p>{dataset.description[language]}</p>
                <dl className="source-metadata">
                  <div>
                    <dt>{t("Published records", "公開紀錄數")}</dt>
                    <dd>
                      {dataset.status === "available" &&
                      !dataset.file &&
                      !dataset.raster
                        ? t("Determined by source query", "依來源查詢結果")
                        : dataset.recordCount.toLocaleString(
                            language === "zh" ? "zh-TW" : "en-US",
                          )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {t("Observation / edition period", "觀測／版本期間")}
                    </dt>
                    <dd>
                      {dataset.dateRange
                        ? dataset.dateRange.join(" – ")
                        : t("No observation range supplied", "未提供觀測期間")}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {t(
                        "Source / imported edition update",
                        "來源／匯入版本更新",
                      )}
                    </dt>
                    <dd>{dataset.updatedAt || t("Not supplied", "未提供")}</dd>
                  </div>
                  <div>
                    <dt>{t("Licence", "授權")}</dt>
                    <dd>{dataset.licence}</dd>
                  </div>
                </dl>
                <p>{dataset.limitation[language]}</p>
                <div className="source-links">
                  <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
                    {t("Original source", "原始來源")}
                    <ArrowUpRight size={14} />
                  </a>
                  {dataset.licenceUrl && (
                    <a
                      href={dataset.licenceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("Licence terms", "授權條款")}
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                  {dataset.file && dataset.status === "available" && (
                    <a href={assetUrl(dataset.file)} download>
                      {t("Processed GeoJSON", "處理後 GeoJSON")}
                      <ArrowDownToLine size={14} />
                    </a>
                  )}
                  {dataset.statisticsFile && (
                    <a href={assetUrl(dataset.statisticsFile)} download>
                      {t("Statistical summary", "統計摘要")}
                      <ArrowDownToLine size={14} />
                    </a>
                  )}
                  {dataset.raster && (
                    <a href={assetUrl(dataset.raster.url)} download>
                      {t("Rendered raster overview", "影像概覽")}
                      <ArrowDownToLine size={14} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
          {data.resources.length > 0 && (
            <div className={styles.resources}>
              <h2>{t("Additional official resources", "其他官方資源")}</h2>
              {data.resources.map((resource, index) => (
                <article
                  className={styles.resource}
                  key={`${resource.url}-${index}`}
                >
                  <h3>
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      {resource.title[language]}
                      <ArrowUpRight size={14} />
                    </a>
                  </h3>
                  <p>{resource.description[language]}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
