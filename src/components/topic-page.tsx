"use client";
import { LazyBoundary, MissingPiece } from "./pwa/lazy-boundary";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bird,
  Database,
  Info,
  Leaf,
  Map,
  Mountain,
  Sprout,
  TreePine,
  Wind,
} from "lucide-react";
import { useLanguage, useObservations } from "./providers";
import { Status, useFormatTime } from "./status";
import { MethodologyFaq } from "./watermelon/methodology-faq";
import { Footer } from "./footer";
import { sources } from "@/lib/sources";
import { AtlasSourceLibrary } from "./atlas-source-library";
const ObservationChart = dynamic(() => import("./observation-chart"), {
  ssr: false,
});
const topics = {
  environment: {
    en: "Our shared environment.",
    zh: "我們共同的環境。",
    enSub: "Air quality and weather, grounded in observation.",
    zhSub: "以實際觀測為基礎的空氣品質與氣象。",
    Icon: Wind,
    stage: 1,
    sourceIds: ["aqi", "weather", "river"],
    enNote:
      "AQI and weather adapters are ready. River sample imports, historical storage and county comparisons are planned for Milestone 2. River samples will be labelled by sampling date, separately from publication time.",
    zhNote:
      "空品與氣象介接已備妥。河川採樣匯入、歷史儲存與縣市比較將於第二階段實作。河川資料將以採樣日期呈現，與發布時間分開。",
  },
  forests: {
    en: "A landscape in transition.",
    zh: "變遷中的地景。",
    enSub: "Historical land cover, with the methodology in view.",
    zhSub: "以透明方法呈現歷史土地覆蓋。",
    Icon: TreePine,
    stage: 3,
    sourceIds: ["landcover"],
    enNote:
      "The 2013 and 2023 land-cover comparison is planned for Milestone 3. Dataset metadata, licence, classes and CRS have not yet been verified. No forest area or change values are published. Future area calculations will use a suitable projected CRS.",
    zhNote:
      "2013 與 2023 年土地覆蓋比較規劃於第三階段。尚未驗證資料集詮釋資料、授權、分類與座標系；目前不發布森林面積或變遷數值。未來將使用適當投影座標系計算面積。",
  },
  wildlife: {
    en: "Life along the roads.",
    zh: "道路旁的生命。",
    enSub: "Citizen observations, with their context preserved.",
    zhSub: "保留公民觀察的資料脈絡。",
    Icon: Bird,
    stage: 3,
    sourceIds: ["roadkill"],
    enNote:
      "The requested roadkill archive covers 2011–December 2017. Import and validation are planned for Milestone 3. It is historical, not live wildlife monitoring. Reporting density reflects observer effort and sampling bias; it cannot directly establish roadkill risk.",
    zhNote:
      "指定路死典藏涵蓋 2011 至 2017 年 12 月，第三階段將匯入與驗證。這是歷史資料，並非即時野生動物監測。通報密度受觀察投入與採樣偏差影響，無法直接判定路死風險。",
  },
  culture: {
    en: "People, place & belonging.",
    zh: "人、地方與歸屬。",
    enSub: "Public cultural geography, approached with care.",
    zhSub: "審慎呈現公開文化地理資訊。",
    Icon: Mountain,
    stage: 4,
    sourceIds: ["villages"],
    enNote:
      "Official Indigenous village points are planned for Milestone 4, after metadata and licence verification. Village locations will not be used to infer traditional territories. Names and cultural information will only be published as documented by verified sources.",
    zhNote:
      "官方原住民族部落點位將於第四階段確認詮釋資料及授權後匯入。不會由部落點位推論傳統領域；名稱與文化資訊僅依經確認的來源紀錄刊載。",
  },
  urban: {
    en: "Room for a greener city.",
    zh: "讓城市更綠的空間。",
    enSub: "Understand measured air temperatures and urban nature.",
    zhSub: "認識實測氣溫與都市自然。",
    Icon: Sprout,
    stage: 4,
    sourceIds: ["weather", "urban"],
    enNote:
      "Measured station air temperatures are available after CWA configuration. Parks, public trees and satellite surface temperature are planned for Milestone 4. Air temperature and land-surface temperature are distinct; municipal inventories will not be presented as nationwide coverage.",
    zhNote:
      "設定 CWA 金鑰後可查看測站實測氣溫。公園、公共樹木與衛星地表溫度規劃於第四階段。氣溫與地表溫度不同，地方清冊也不會被呈現為全國完整資料。",
  },
};
export type Topic = keyof typeof topics;
export function TopicPage({ topic }: { topic: Topic }) {
  const content = topics[topic],
    { t, language } = useLanguage(),
    aqi = useObservations("aqi"),
    weather = useObservations("weather"),
    format = useFormatTime();
  return (
    <main id="main" className="document-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {t("THE TAIWAN FIELD GUIDE", "臺灣探索指南")}
          </span>
          <h1>{t(content.en, content.zh)}</h1>
          <p>{t(content.enSub, content.zhSub)}</p>
        </div>
        <content.Icon size={56} strokeWidth={1} />
      </div>
      <div className="topic-layout">
        <section className="topic-main">
          <div className="editorial-panel">
            <span className="eyebrow">{t("WHAT’S AVAILABLE", "目前進度")}</span>
            <h2>
              {topic === "environment" || topic === "urban"
                ? t("Start with the station map.", "從測站地圖開始。")
                : t("A documented next chapter.", "有依據的下一個篇章。")}
            </h2>
            <p>{t(content.enNote, content.zhNote)}</p>
            <Link className="button" href="/explore">
              {t("Open map explorer", "開啟地圖探索")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          {(topic === "environment" || topic === "urban") && (
            <div className="observation-panels">
              {(topic === "urban" ? [weather] : [aqi, weather]).map(
                (result, index) => {
                  const kind =
                      topic === "urban" || index === 1 ? "weather" : "aqi",
                    source = sources.find((s) => s.id === kind)!;
                  return (
                    <article className="observation-panel" key={kind}>
                      <h3>{source.name[language]}</h3>
                      <Status
                        status={result.data?.status}
                        loading={result.loading}
                      />
                      <p>
                        {result.data?.observations.length
                          ? `${result.data.observations.length} ${t("validated station reports loaded", "筆通過驗證的測站報告")}`
                          : t(
                              "No observations loaded. Configure this source to begin.",
                              "尚未載入觀測，請先設定此來源。",
                            )}
                      </p>
                      <dl>
                        <dt>{t("Observation", "觀測")}</dt>
                        <dd>{format(result.data?.lastObservationAt)}</dd>
                        <dt>{t("Publication", "發布")}</dt>
                        <dd>{format(result.data?.publishedAt)}</dd>
                        <dt>{t("Last retrieval", "最後擷取")}</dt>
                        <dd>{format(result.data?.retrievedAt)}</dd>
                      </dl>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.agency[language]}
                        <ArrowUpRight size={13} />
                      </a>
                      <small>
                        {t(
                          "Open Government Data License 1.0 · Asia/Taipei",
                          "政府資料開放授權條款第 1 版・臺北時間",
                        )}
                      </small>
                    </article>
                  );
                },
              )}
            </div>
          )}
          {topic === "environment" && !!aqi.data?.observations.length && (
            <section className="editorial-panel">
              <h2>{t("Where reports are available", "觀測報告的分布")}</h2>
              <p>
                {t(
                  "Counts of loaded AQI station reports by reported county; this is coverage, not a pollution comparison.",
                  "依來源縣市欄位統計已載入空品報告數，呈現資料分布，不是污染程度比較。",
                )}
              </p>
              <LazyBoundary fallback={<MissingPiece kind="block" />}>
                <ObservationChart observations={aqi.data.observations} />
              </LazyBoundary>
            </section>
          )}
        </section>
        <aside className="topic-aside">
          <span className="eyebrow">{t("SOURCE NOTES", "來源說明")}</span>
          {sources
            .filter((s) => content.sourceIds.includes(s.id))
            .map((source) => (
              <article key={source.id}>
                <Database size={18} />
                <h3>{source.name[language]}</h3>
                <p>{source.coverage[language]}</p>
                <Link href="/sources">
                  {t("Metadata & limitations", "詮釋資料與限制")}
                  <ArrowUpRight size={13} />
                </Link>
              </article>
            ))}
          <div className="aside-note">
            <Info size={17} />
            <p>
              {t(
                "Data is published only after source validation. Empty states represent missing configuration or pending imports.",
                "資料經來源驗證後才會發布。空白狀態代表缺少設定或尚未匯入。",
              )}
            </p>
          </div>
        </aside>
      </div>
      <Footer />
    </main>
  );
}
export function AboutPage() {
  const { t } = useLanguage();
  return (
    <main id="main" className="document-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {t("ABOUT THIS PROJECT", "關於本專案")}
          </span>
          <h1>
            {t("A clearer picture of our island.", "更清楚地看見我們的島嶼。")}
          </h1>
          <p>
            {t(
              "An open environmental and cultural atlas for Taiwan.",
              "臺灣的開放環境與文化地圖。",
            )}
          </p>
        </div>
        <Leaf size={52} strokeWidth={1} />
      </div>
      <div className="about-grid">
        <article className="editorial-panel">
          <Map size={25} />
          <h2>{t("One map, many connections", "一張地圖，多種連結")}</h2>
          <p>
            {t(
              "Taiwan EcoAtlas brings environmental observations, forest classifications, historical wildlife records, public cultural geography and municipal inventories into one accessible map. Each subject provides filters, evidence and its own coverage limits.",
              "Taiwan EcoAtlas 將環境觀測、森林分類、歷史野生動物紀錄、公開文化地理與地方清冊帶入共同地圖。各專題提供篩選、證據與自身的涵蓋限制。",
            )}
          </p>
        </article>
        <article className="editorial-panel">
          <Info size={25} />
          <h2>{t("Methodology before claims", "先確認方法，再提出結論")}</h2>
          <p>
            {t(
              "County geometry comes from official dataset 7442. Its TWD97 geographic CRS is inspected and transformed to WGS84, with all original vertices retained. Measurements are validated for coordinates, missing values, identifiers and timestamps. A current request does not make an old observation current.",
              "縣市幾何取自官方 7442 資料集，確認 TWD97 地理座標系後轉為 WGS84，保留所有原始節點。測值須驗證座標、缺值、識別碼與時間。現在擷取到的舊觀測不會被當作現在的觀測。",
            )}
          </p>
        </article>
        <article className="editorial-panel">
          <Database size={25} />
          <h2>{t("Open, with attribution", "開放並註明出處")}</h2>
          <p>
            {t(
              "Each dataset retains its own agency, licence, coverage and update policy. The map uses OpenFreeMap with OpenStreetMap-derived basemaps and the required attribution. Source limitations remain visible alongside the imported public data.",
              "每份資料保留各自的機關、授權、涵蓋範圍及更新政策。地圖使用 OpenFreeMap 與 OpenStreetMap 衍生底圖並標註來源；匯入的公開資料持續顯示其來源限制。",
            )}
          </p>
          <Link className="text-link" href="/sources">
            {t("Inspect the source registry", "查看來源登錄")}
            <ArrowUpRight size={15} />
          </Link>
        </article>
        <article className="editorial-panel">
          <TreePine size={25} />
          <h2>{t("Growing in verified steps", "以驗證過的步驟成長")}</h2>
          <p>
            {t(
              "The public platform includes live government observations and processed historical research, wildlife, village and Taipei inventory data. A verified 2013 land-cover baseline, continuous environmental history, satellite surface-temperature scenes and moderated public submissions still require additional data or infrastructure. These are not presented as completed features.",
              "公開平台收錄政府最新觀測，以及處理後的歷史研究、野生動物、部落與臺北清冊資料。可確認的 2013 土地覆蓋基準、連續環境歷史、衛星地表溫度影像與經審核的公民提交，仍須額外資料或基礎設施，不會被當作已完成功能。",
            )}
          </p>
        </article>
      </div>
      <MethodologyFaq />
      <section className="about-credit" aria-labelledby="about-credit-title">
        <h2 id="about-credit-title">{t("Who built this", "誰做的")}</h2>
        <p>
          {t(
            "Taiwan EcoAtlas is a student project by Ethan Yen (顏名宣) at National Tsing Hua University (NTHU, 國立清華大學). It was made so teachers and students can use real open data about Taiwan’s environment and culture in class.",
            "Taiwan EcoAtlas 是國立清華大學（NTHU）學生顏名宣（Ethan Yen）製作的專題，希望讓老師與學生能在課堂上使用臺灣環境與文化的真實開放資料。",
          )}
        </p>
      </section>
      <Footer />
    </main>
  );
}
export function DataPage() {
  const { t } = useLanguage();
  return (
    <main id="main" className="document-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {t("OPEN DATA WORKSPACE", "開放資料工作區")}
          </span>
          <h1>{t("Take a closer look.", "仔細看見資料。")}</h1>
          <p>
            {t(
              "Download verified geography, historical editions and statistical summaries. Check each source's period, coverage and privacy treatment before comparing records.",
              "下載已驗證地理、歷史版本與統計摘要；比較紀錄前，請確認各來源的年代、涵蓋範圍與隱私處理。",
            )}
          </p>
        </div>
        <Database size={48} strokeWidth={1} />
      </div>
      <section className="download-grid">
        <article className="editorial-panel">
          <span className="eyebrow">GEOJSON · WGS84</span>
          <h2>{t("Official county boundaries", "官方縣市界線")}</h2>
          <p>
            {t(
              "22 county/city units. Edition 2025-03-18, converted from the official NLSC archive without polygon simplification. Open Government Data License 1.0. Approximately 8.2 MB.",
              "22 個縣市。版本為 2025-03-18，由官方國土測繪中心檔案轉換，未簡化多邊形。政府資料開放授權條款第 1 版。約 8.2 MB。",
            )}
          </p>
          <a className="button" href="/data/counties.geojson" download>
            {t("Download GeoJSON", "下載 GeoJSON")}
            <ArrowDownToLine size={16} />
          </a>
          <a className="text-link" href="/data/counties.metadata.json" download>
            {t("Processing metadata & checksums", "處理紀錄與檢查碼")}
            <ArrowDownToLine size={14} />
          </a>
        </article>
        <article className="editorial-panel">
          <span className="eyebrow">JSON · API</span>
          <h2>{t("Observation endpoints", "觀測資料端點")}</h2>
          <p>
            {t(
              "Validated AQI and weather reports retain freshness status, retrieval times and exclusion counts. River samples retain sampling dates and publication lag. These API extracts are distinct from the static historical editions below.",
              "驗證後空品與氣象報告保留新鮮度、擷取時間與排除筆數；河川樣本保留採樣日期與發布延遲。這些 API 擷取資料與下方靜態歷史版本分開呈現。",
            )}
          </p>
          <a
            className="text-link"
            href="/api/observations/aqi"
            target="_blank"
            rel="noreferrer"
          >
            AQI · JSON
            <ArrowUpRight size={14} />
          </a>
          <a
            className="text-link"
            href="/api/observations/weather"
            target="_blank"
            rel="noreferrer"
          >
            {t("Weather", "氣象")} · JSON
            <ArrowUpRight size={14} />
          </a>
          <p className="small muted">
            {t("Optional viewport filter", "可選視窗篩選")}:{" "}
            <code>?bbox=117.8,21.7,122.2,26.6</code>
          </p>
          <a
            className="text-link"
            href="/api/atlas/river-quality"
            target="_blank"
            rel="noreferrer"
          >
            {t("River samples", "河川採樣")} · JSON
            <ArrowUpRight size={14} />
          </a>
        </article>
      </section>
      <AtlasSourceLibrary />
      <Footer />
    </main>
  );
}
