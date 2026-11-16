"use client";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Info,
  RefreshCw,
} from "lucide-react";
import { sources } from "@/lib/sources";
import { useLanguage, useObservations } from "./providers";
import { Status, useFormatTime } from "./status";
import { Footer } from "./footer";
import { AtlasSourceLibrary } from "./atlas-source-library";
export function SourceRegistry() {
  const { t, language } = useLanguage(),
    format = useFormatTime();
  const aqi = useObservations("aqi"),
    weather = useObservations("weather");
  const [status, setStatus] = useState<{ persistence: boolean } | null>(null);
  const [boundary, setBoundary] = useState<{ retrievedAt: string } | null>(
    null,
  );
  useEffect(() => {
    void fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
    void fetch("/data/counties.metadata.json")
      .then((r) => r.json())
      .then(setBoundary)
      .catch(() => {});
  }, []);
  return (
    <main id="main" className="document-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {t("THE EVIDENCE BEHIND THE ATLAS", "地圖背後的依據")}
          </span>
          <h1>{t("Sources, openly documented.", "公開記錄每個資料來源。")}</h1>
          <p>
            {t(
              "Know where the data comes from, when it was observed, and what it can tell you.",
              "了解資料來自哪裡、何時觀測，以及能夠說明什麼。",
            )}
          </p>
        </div>
        <Database size={48} strokeWidth={1} />
      </div>
      <div className="configuration-banner">
        <Info size={21} />
        <div>
          <h2>
            {t("Live services and published editions", "即時服務與公開版本")}
          </h2>
          <p>
            {t(
              "Station status below reflects current API requests. River samples are collected monthly and published later. Forest, wildlife, cultural and urban layers use documented source editions; historical dates remain visible and do not become live observations.",
              "下方測站狀態反映目前 API 請求。河川資料按月採樣後延後發布。森林、野生動物、文化與都市圖層使用已記錄之來源版本，保留歷史年代，不作即時觀測。",
            )}
          </p>
          <span>
            {t("Persistent snapshots", "持久化快照")}:{" "}
            {status
              ? status.persistence
                ? t(
                    "Configuration present; database not yet verified",
                    "已有設定；尚未驗證資料庫",
                  )
                : t(
                    "Not configured — in-memory cache only",
                    "尚未設定，僅使用記憶體快取",
                  )
              : t("Checking…", "檢查中…")}
          </span>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            aqi.refresh();
            weather.refresh();
          }}
        >
          <RefreshCw size={15} />
          {t("Refresh status", "重新檢查")}
        </button>
      </div>
      <div className="source-list">
        {sources.map((source) => {
          const result =
            source.id === "aqi"
              ? aqi
              : source.id === "weather"
                ? weather
                : null;
          return (
            <article className="source-card" key={source.id}>
              <div className="source-card-top">
                <div>
                  <span className="eyebrow">{source.agency[language]}</span>
                  <h2>{source.name[language]}</h2>
                  <code>{source.datasetId}</code>
                </div>
                {result ? (
                  <Status
                    status={result.data?.status}
                    loading={result.loading}
                  />
                ) : (
                  <span
                    className={`source-state ${source.stage === "ready" ? "verified" : ""}`}
                  >
                    {source.id === "counties" ? (
                      <>
                        <CheckCircle2 size={14} />
                        {t("Verified static edition", "已驗證靜態版本")}
                      </>
                    ) : source.id === "river" ? (
                      t("Server API adapter", "伺服器 API 介接")
                    ) : source.stage === "ready" ? (
                      t("Published source edition", "公開來源版本")
                    ) : (
                      t("Unavailable", "尚無可用資料")
                    )}
                  </span>
                )}
              </div>
              <p>{source.note[language]}</p>
              <dl className="source-metadata">
                <div>
                  <dt>{t("Coverage", "資料範圍")}</dt>
                  <dd>{source.coverage[language]}</dd>
                </div>
                <div>
                  <dt>{t("Expected source updates", "預期來源更新")}</dt>
                  <dd>{source.frequency[language]}</dd>
                </div>
                <div>
                  <dt>{t("Application cache interval", "應用程式快取間隔")}</dt>
                  <dd>
                    {source.cacheSeconds
                      ? source.cacheSeconds < 3600
                        ? `${source.cacheSeconds / 60} ${t("minutes", "分鐘")}`
                        : source.cacheSeconds < 86400
                          ? `${source.cacheSeconds / 3600} ${t("hours", "小時")}`
                          : `${source.cacheSeconds / 86400} ${t("days", "天")}`
                      : t("Version based", "依版本")}
                  </dd>
                </div>
                <div>
                  <dt>{t("Latest observation", "最新觀測")}</dt>
                  <dd>
                    {source.id === "counties"
                      ? t(
                          "Boundary edition: 18 Mar 2025",
                          "界線版本：2025 年 3 月 18 日",
                        )
                      : format(result?.data?.lastObservationAt)}
                  </dd>
                </div>
                <div>
                  <dt>{t("Source publication", "來源發布")}</dt>
                  <dd>{format(result?.data?.publishedAt)}</dd>
                </div>
                <div>
                  <dt>{t("Last successful retrieval", "最後成功擷取")}</dt>
                  <dd>
                    {format(
                      source.id === "counties"
                        ? boundary?.retrievedAt
                        : result?.data?.retrievedAt,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t("Licence", "授權")}</dt>
                  <dd>
                    {source.licence}
                    {!source.verifiedLicence && (
                      <span className="licence-pending">
                        {t("Verification pending", "尚待驗證")}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              {result?.data?.status === "not-configured" && (
                <div className="source-config-note">
                  {t(
                    "Requires server environment variable",
                    "需要伺服器環境變數",
                  )}
                  : <code>{result.data.message}</code>
                </div>
              )}
              {result?.error && (
                <p role="alert">
                  {t(
                    "The application could not retrieve status. Retry to check the connection.",
                    "應用程式無法取得狀態，請重試檢查連線。",
                  )}
                </p>
              )}
              {result?.data?.message === "upstream-unavailable" && (
                <p role="alert">
                  {t(
                    "Upstream request failed. Any previous successful result is retained and marked stale.",
                    "來源請求失敗，先前成功取得的資料會保留並標示為已過期。",
                  )}
                </p>
              )}
              <div className="source-links">
                <a href={source.url} target="_blank" rel="noreferrer">
                  {t("Original source", "原始來源")}
                  <ArrowUpRight size={14} />
                </a>
                {source.licenceUrl && (
                  <a href={source.licenceUrl} target="_blank" rel="noreferrer">
                    {t("Licence terms", "授權條款")}
                    <ArrowUpRight size={14} />
                  </a>
                )}
                {source.id === "counties" && (
                  <a href="/data/counties.geojson" download>
                    {t("Download GeoJSON", "下載 GeoJSON")}
                    <ArrowDownToLine size={14} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <AtlasSourceLibrary />
      <Footer />
    </main>
  );
}
