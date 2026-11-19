"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bird,
  CircleCheck,
  Mountain,
  Sprout,
  TreePine,
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
    "Compare loaded air-quality and weather reports and explore monthly river samples. Check observation and sampling dates before comparing counties; monthly water samples are not live river conditions.",
    "比較已載入空品與氣象報告，探索每月河川採樣。比較縣市前請確認觀測與採樣日期；月採樣不代表即時河川水況。",
  ],
  [
    "Explore the verified 2023 land-cover raster and county forest summaries. Offshore gaps and unresolved classes stay visible; a verified 2013 baseline is unavailable, so no 2013 change statistic is invented.",
    "探索驗證之 2023 土地覆蓋影像及縣市森林摘要。離島缺口與未區分類別保持可見；尚無已驗證 2013 基準，不虛構 2013 變遷統計。",
  ],
  [
    "Filter a limited 2014–2017 public roadkill subset by species, county and date. Locations are generalized to 10 km grid centres. Recorded frequency reflects observer effort, not animal abundance or roadkill risk.",
    "依物種、縣市與日期篩選有限之 2014–2017 公開路死子集。位置概化為 10 公里網格中心；頻次受觀察投入影響，不代表動物數量或路死風險。",
  ],
  [
    "Explore 730 validated village reference points, source-listed traditional names and groups, public historical trails and original historical studies. Public points do not define traditional territories or access rights.",
    "探索 730 筆驗證之部落定位點、來源傳統名制與族別、公開古道及原始歷史研究。公開點位不代表傳統領域或進入權利。",
  ],
  [
    "Explore Taipei park and tree inventories alongside measured CWA air temperatures. Tree survey records are not proof of current survival or nationwide coverage; satellite surface temperature remains a separate, unavailable source.",
    "將臺北市公園與樹木清冊和 CWA 實測氣溫分別探索。樹木調查紀錄不證明目前存活，也非全國完整覆蓋；衛星地表溫度為尚未匯入之獨立來源。",
  ],
];
const themeStatus = [
  ["Station reports & monthly river samples", "測站報告與每月河川採樣"],
  ["2023 research raster · offshore gaps", "2023 研究影像・離島有缺口"],
  [
    "Limited historical subset · generalized locations",
    "有限歷史子集・概化位置",
  ],
  ["Public villages, trails & historical studies", "公開部落、古道與歷史研究"],
  [
    "Taipei inventories · measured station air temperature",
    "臺北市清冊・測站實測氣溫",
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
          <h1>
            {t(
              "What the open data says about Taiwan’s environment,",
              "開放資料怎麼說臺灣的環境，",
            )}
            <em>{t("and what it leaves out.", "以及它沒說的部分。")}</em>
          </h1>
          <p>
            {t(
              "Air quality and weather from MOENV and CWA, 2023 forest cover, a screened wildlife subset, 730 villages and Taipei’s park trees. Every layer shows its source, its date and its gaps.",
              "環境部與中央氣象署的空品與氣象、2023 年森林覆蓋、經篩選的野生動物子集、730 個部落與臺北市公園樹木。每個圖層都標明來源、日期與缺口。",
            )}
          </p>
          <div className="hero-actions">
            <Link href="/explore" className="button">
              {t("Open the map", "開啟地圖")}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/about">
              {t("How the atlas works", "EcoAtlas 如何運作")}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-status">
          <p className="hero-status-title">
            {t("Source status right now", "目前的資料來源狀態")}
          </p>
          <dl>
            <div>
              <dt>{t("County geography", "縣市地理")}</dt>
              <dd>
                <span className="verified-inline">
                  <CircleCheck size={14} />
                  22 {t("verified units", "已驗證行政區")}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("Air quality · MOENV", "空氣品質・環境部")}</dt>
              <dd>
                <Status status={aqi.data?.status} loading={aqi.loading} />
              </dd>
            </div>
            <div>
              <dt>{t("Weather · CWA", "氣象・中央氣象署")}</dt>
              <dd>
                <Status
                  status={weather.data?.status}
                  loading={weather.loading}
                />
              </dd>
            </div>
          </dl>
          <Link className="text-link" href="/sources">
            {t("All sources and licences", "所有來源與授權")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="hero-map">
          <Explorer compact island />
          <div className="map-caption">
            {t(
              "22 official counties and cities · Taiwan and its offshore islands",
              "22 個官方縣市・臺灣本島與離島",
            )}
          </div>
        </div>
      </section>
      <section className="themes-section">
        <div className="section-heading">
          <h2>
            {t(
              "Five subjects, each with its own limits.",
              "五個主題，各有各的資料限制。",
            )}
          </h2>
          <p>
            {t(
              "Open one to see what it covers, how old it is and what is missing.",
              "展開任一主題，查看涵蓋範圍、資料年代與缺漏。",
            )}
          </p>
        </div>
        <SplitAccordion
          items={themes.map((theme, index) => ({
            id: theme.href.slice(1),
            title: t(theme.en, theme.zh),
            subtitle: t(theme.enSub, theme.zhSub),
            icon: <theme.Icon size={24} strokeWidth={1.5} />,
            status: t(themeStatus[index][0], themeStatus[index][1]),
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
        <h2>
          {t(
            "Every dataset keeps its own date, coverage and gaps.",
            "每個資料集都保留自己的年代、範圍與缺口。",
          )}
        </h2>
        <div className="principles-body">
          <p>
            {t(
              "Historical archives stay historical. Station measurements stay local. Missing data stays visible instead of being filled in.",
              "歷史典藏保留其年代，測站數據反映當地實測，資料缺口保持可見而不補造。",
            )}
          </p>
          <p>
            {t(
              "Each available dataset lists its agency, observation time, retrieval status and licence.",
              "每個可用資料集都列出機關、觀測時間、擷取狀態與授權。",
            )}
          </p>
          <Link className="text-link" href="/sources">
            {t("Read the source notes", "閱讀資料來源說明")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
