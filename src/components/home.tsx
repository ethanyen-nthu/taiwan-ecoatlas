"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bird,
  BookOpen,
  CircleCheck,
  Layers3,
  MapPin,
  Mountain,
  Sprout,
  TreePine,
  Waves,
  Wind,
} from "lucide-react";
import Explorer from "./map/explorer";
import { SplitAccordion } from "./watermelon/split-accordion";
import { useLanguage, useObservations } from "./providers";
import { Footer } from "./footer";
import { Status } from "./status";
const themes = [
  {
    href: "/environment",
    en: "The air we share",
    zh: "我們呼吸的空氣",
    enSub: "Air quality, weather & water",
    zhSub: "空氣品質、氣象與水質",
    Icon: Wind,
  },
  {
    href: "/forests",
    en: "A changing landscape",
    zh: "變遷中的地景",
    enSub: "Forests & historical land cover",
    zhSub: "森林與歷史土地覆蓋",
    Icon: TreePine,
  },
  {
    href: "/wildlife",
    en: "Life along the roads",
    zh: "道路旁的生命",
    enSub: "Historical wildlife observations",
    zhSub: "歷史野生動物觀察",
    Icon: Bird,
  },
  {
    href: "/culture",
    en: "People & place",
    zh: "人與地方",
    enSub: "Indigenous cultural geography",
    zhSub: "原住民族文化地理",
    Icon: Mountain,
  },
  {
    href: "/urban",
    en: "Greener everyday spaces",
    zh: "更綠的日常空間",
    enSub: "Urban temperatures & green spaces",
    zhSub: "都市氣溫與綠地",
    Icon: Sprout,
  },
];
const themeNotes = [
  [
    "Locate air quality and weather station reports, inspect their timestamps, and understand the source behind each measurement.",
    "尋找空品與氣象測站報告，確認觀測時間，理解每筆測量背後的來源。",
  ],
  [
    "Follow the planned 2013 and 2023 land-cover comparison. Source classes and methodology will be verified before any change statistics are published.",
    "認識規劃中的 2013 與 2023 土地覆蓋比較；發布變遷統計前，會先確認來源分類與方法。",
  ],
  [
    "Explore the context of a historical roadkill archive. Reporting density reflects observer effort as well as wildlife encounters.",
    "了解歷史路死典藏的資料脈絡。通報密度同時受觀察投入及野生動物遭遇影響。",
  ],
  [
    "Learn about the planned public village geography layer. Village points document locations; they do not define traditional territories.",
    "認識規劃中的公開部落地理圖層。部落點位記錄位置，不代表傳統領域範圍。",
  ],
  [
    "Start with measured station air temperatures. Verified parks, tree inventories and satellite surface temperatures will be added as distinct sources.",
    "從測站實測氣溫開始。經驗證的公園、樹木清冊與衛星地表溫度將作為不同來源加入。",
  ],
];
export function Home() {
  const { t } = useLanguage(),
    aqi = useObservations("aqi"),
    weather = useObservations("weather");
  return (
    <main id="main">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" />
            {t("AN OPEN ATLAS FOR TAIWAN", "臺灣的開放環境地圖")}
          </div>
          <h1>
            {t("One island.", "一座島嶼。 ")}
            <br />
            <em>{t("Many perspectives.", "多元視角。")}</em>
          </h1>
          <p>
            {t(
              "See how nature, people and a changing environment connect. Explore Taiwan through open data, one layer at a time.",
              "看見自然、人與變遷環境的連結。透過開放資料，一層一層探索臺灣。",
            )}
          </p>
          <div className="hero-actions">
            <Link href="/explore" className="button">
              {t("Explore the map", "探索地圖")}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/about">
              {t("Meet the atlas", "認識 EcoAtlas")}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-footnote">
            <CircleCheck size={15} />
            {t(
              "Real sources. Clear limitations. A shared understanding.",
              "真實來源、透明限制，共同認識這片土地。",
            )}
          </div>
        </div>
        <div className="hero-map">
          <div className="hero-map-heading">
            <span>
              <span className="live-dot" />
              {t("THE ISLAND, IN CONTEXT", "在脈絡中看見島嶼")}
            </span>
            <span>
              22 {t("official counties & cities", "官方縣市")} / WGS84
            </span>
          </div>
          <Explorer compact />
          <div className="map-caption">
            <span>
              <MapPin size={13} />
              {t("Taiwan & its offshore islands", "臺灣與離島")}
            </span>
            <span>22 {t("counties & cities", "縣市")}</span>
          </div>
        </div>
      </section>
      <section
        className="status-strip"
        aria-label={t("Data connection status", "資料連線狀態")}
      >
        <div className="status-intro">
          <DatabaseIcon />
          <span>
            {t("From source to understanding", "從資料來源到理解")}
            <small>
              {t("A transparent view of what’s available", "透明呈現可用資料")}
            </small>
          </span>
        </div>
        <div>
          <span>{t("County geography", "縣市地理")}</span>
          <span className="verified-inline">
            <CircleCheck size={14} />
            22 {t("verified units", "已驗證行政區")}
          </span>
        </div>
        <div>
          <span>{t("Air quality · MOENV", "空氣品質・環境部")}</span>
          <Status status={aqi.data?.status} loading={aqi.loading} />
        </div>
        <div>
          <span>{t("Weather · CWA", "氣象・中央氣象署")}</span>
          <Status status={weather.data?.status} loading={weather.loading} />
        </div>
        <Link
          href="/sources"
          aria-label={t("View all sources", "檢視所有來源")}
        >
          <ArrowUpRight size={19} />
        </Link>
      </section>
      <section className="themes-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              {t("FIVE WAYS TO SEE TAIWAN", "看見臺灣的五種方式")}
            </span>
            <h2>{t("Every layer tells a story.", "每個圖層，都有故事。")}</h2>
          </div>
          <p>
            {t(
              "Start with a question. Find a connection.",
              "從一個問題出發，找到彼此的連結。",
            )}
          </p>
        </div>
        <SplitAccordion
          items={themes.map((theme, index) => ({
            id: theme.href.slice(1),
            title: t(theme.en, theme.zh),
            subtitle: t(theme.enSub, theme.zhSub),
            icon: <theme.Icon size={24} strokeWidth={1.5} />,
            status:
              index === 0
                ? t(
                    "Latest station reports · configuration required",
                    "最新測站報告・需要設定",
                  )
                : index === 4
                  ? t(
                      "Station temperatures · CWA configuration required",
                      "測站氣溫・需要 CWA 設定",
                    )
                  : t("Source import planned", "規劃匯入來源"),
            content: (
              <>
                <p>{t(themeNotes[index][0], themeNotes[index][1])}</p>
                <Link href={theme.href} className="text-link">
                  {t("Explore this subject", "探索這個主題")}
                  <ArrowUpRight size={16} />
                </Link>
              </>
            ),
          }))}
        />
      </section>
      <section className="principles">
        <div>
          <span className="eyebrow">
            {t("BUILT ON TRANSPARENCY", "以透明為基礎")}
          </span>
          <h2>
            {t(
              "A map is only as useful\nas the trust behind it.",
              "值得信任的地圖，\n才有真正的價值。",
            )}
          </h2>
          <Link className="text-link" href="/sources">
            {t("Read our source notes", "閱讀資料來源說明")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <article>
          <BookOpen size={23} />
          <h3>{t("Trace every observation", "追溯每筆觀測")}</h3>
          <p>
            {t(
              "See the agency, observation time, retrieval status and licence behind every available dataset.",
              "查閱每個可用資料集的機關、觀測時間、擷取狀態與授權。",
            )}
          </p>
        </article>
        <article>
          <Layers3 size={23} />
          <h3>{t("Keep the context", "保留資料脈絡")}</h3>
          <p>
            {t(
              "Historical archives stay historical. Station measurements stay local. Missing data stays visible.",
              "歷史典藏保留其年代，測站數據反映當地實測，資料缺口保持可見。",
            )}
          </p>
        </article>
      </section>
      <Footer />
    </main>
  );
}
function DatabaseIcon() {
  return (
    <span className="status-intro-icon">
      <Waves size={23} strokeWidth={1.4} />
    </span>
  );
}
