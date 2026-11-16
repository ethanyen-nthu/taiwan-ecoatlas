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
