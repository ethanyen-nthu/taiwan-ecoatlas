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
import { useLanguage, useObservations } from "./providers";
import { Footer } from "./footer";
import { Status } from "./status";
import { islandPath, islandViewBox } from "@/lib/island-path";

/** Numbers counted from the published data files on the server. */
export interface HomeFacts {
  wildlifeRecords: number;
  species: number;
  firstYear: string;
  lastYear: string;
  villages: number;
  groups: number;
  parks: number;
  parkTrees: number;
  forestTop: { en: string; zh: string; sharePct: number } | null;
}
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
export function Home({ facts }: { facts: HomeFacts }) {
  const { t, language } = useLanguage(),
    aqi = useObservations("aqi"),
    weather = useObservations("weather");
  const locale = language === "en" ? "en" : "zh-TW";
  const stations = aqi.data?.observations.length || 0;
  const tiles = [
    {
      number: stations ? stations.toLocaleString(locale) : t("Live", "即時"),
      label: stations
        ? t("air-quality stations reporting now", "個空品測站目前回報")
        : t(
            "air, weather and river data, as the agencies report them",
            "空品、氣象與河川資料，依機關回報",
          ),
    },
    {
      number: facts.forestTop
        ? `${Math.round(facts.forestTop.sharePct)}%`
        : "—",
      label: facts.forestTop
        ? t(
            `of ${facts.forestTop.en} is forest in the 2023 map, the highest of the counties with data`,
            `${facts.forestTop.zh}的面積在 2023 年地圖中為森林，為有資料縣市中最高`,
          )
        : "",
    },
    {
      number: facts.wildlifeRecords.toLocaleString(locale),
      label: t(
        `roadside records of ${facts.species} species, ${facts.firstYear}–${facts.lastYear}`,
        `筆路旁紀錄，涵蓋 ${facts.species} 種，${facts.firstYear}–${facts.lastYear}`,
      ),
    },
    {
      number: facts.villages.toLocaleString(locale),
      label: t(
        `village reference points, filed under ${facts.groups} group labels in the source`,
        `個部落定位點，來源列有 ${facts.groups} 個族別標示`,
      ),
    },
    {
      number: facts.parkTrees.toLocaleString(locale),
      label: t(
        `surveyed park trees in Taipei, plus ${facts.parks} parks`,
        `棵臺北市公園樹木調查紀錄，另有 ${facts.parks} 座公園`,
      ),
    },
  ];
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
              "Pick one to explore the map. Each page says what its data cover, how old they are and what is missing.",
              "選一個主題探索地圖。每頁都說明資料涵蓋什麼、年代多久，以及缺了什麼。",
            )}
          </p>
        </div>
        <ul className="subject-tiles">
          {themes.map((theme, index) => {
            const stat = tiles[index];
            return (
              <li key={theme.href} data-tone={theme.href.slice(1)}>
                <Link href={theme.href}>
                  <svg
                    className="subject-tile-island"
                    viewBox={islandViewBox}
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d={islandPath} />
                  </svg>
                  <span className="subject-tile-icon" aria-hidden="true">
                    <theme.Icon size={22} strokeWidth={1.6} />
                  </span>
                  <span className="subject-tile-title">
                    {t(theme.en, theme.zh)}
                  </span>
                  <span className="subject-tile-number">{stat.number}</span>
                  <span className="subject-tile-label">{stat.label}</span>
                  <span className="subject-tile-note">
                    {t(themeStatus[index][0], themeStatus[index][1])}
                  </span>
                  <span className="subject-tile-go">
                    {t("Explore this subject", "探索這個主題")}
                    <ArrowUpRight size={16} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
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
