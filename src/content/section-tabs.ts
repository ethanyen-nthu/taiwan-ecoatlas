import type { Localized } from "@/lib/types";

/**
 * The tab strip shown at the top of every subject page. Each tab is a real
 * page (so it has its own link, back button and title), and every subject
 * lists its map first and its "over time" or guide pages after it.
 */
export type SectionKey =
  "environment" | "forests" | "wildlife" | "culture" | "urban" | "plants";

export interface SectionTab {
  key: string;
  href: string;
  icon: "map" | "trend" | "people" | "guide";
  label: Localized;
  hint: Localized;
}

export const sectionTabs: Record<SectionKey, SectionTab[]> = {
  environment: [
    {
      key: "map",
      href: "/environment",
      icon: "map",
      label: { en: "Live map", zh: "即時地圖" },
      hint: { en: "Air and weather stations now", zh: "此刻的空品與氣象測站" },
    },
    {
      key: "air",
      href: "/environment/air-over-time",
      icon: "trend",
      label: { en: "Air over time", zh: "空氣的變化" },
      hint: { en: "PM2.5, 2013–2025", zh: "PM2.5，2013–2025" },
    },
    {
      key: "rivers",
      href: "/environment/rivers-over-time",
      icon: "trend",
      label: { en: "Rivers over time", zh: "河川的變化" },
      hint: { en: "Pollution, 2002–2025", zh: "污染，2002–2025" },
    },
  ],
  forests: [
    {
      key: "map",
      href: "/forests",
      icon: "map",
      label: { en: "Land-cover map", zh: "土地覆蓋地圖" },
      hint: { en: "County forest shares, 2023", zh: "2023 年各縣市森林比例" },
    },
    {
      key: "cover",
      href: "/forests/over-time",
      icon: "trend",
      label: { en: "Forest over time", zh: "森林的變化" },
      hint: { en: "Two national inventories", zh: "兩次全國森林資源調查" },
    },
  ],
  wildlife: [
    {
      key: "map",
      href: "/wildlife",
      icon: "map",
      label: { en: "Roadkill map", zh: "路死地圖" },
      hint: { en: "Counties, animals, dates", zh: "縣市、動物、日期" },
    },
    {
      key: "years",
      href: "/wildlife/year-by-year",
      icon: "trend",
      label: { en: "Year by year", zh: "逐年比較" },
      hint: { en: "2014–2017, and why", zh: "2014–2017，以及原因" },
    },
  ],
  culture: [
    {
      key: "map",
      href: "/culture",
      icon: "map",
      label: { en: "Village map", zh: "部落地圖" },
      hint: { en: "Villages, studies, trails", zh: "部落、研究、古道" },
    },
    {
      key: "peoples",
      href: "/culture/peoples",
      icon: "people",
      label: { en: "Sixteen peoples", zh: "十六個族群" },
      hint: { en: "A guide to each", zh: "每個族群的導覽" },
    },
    {
      key: "population",
      href: "/culture/population",
      icon: "trend",
      label: { en: "Population over time", zh: "人口的變化" },
      hint: { en: "2011–2025", zh: "2011–2025" },
    },
  ],
  urban: [
    {
      key: "map",
      href: "/urban",
      icon: "map",
      label: { en: "Parks and trees map", zh: "公園與樹木地圖" },
      hint: { en: "Taipei", zh: "臺北市" },
    },
    {
      key: "parks",
      href: "/urban/over-time",
      icon: "trend",
      label: { en: "Parks over time", zh: "公園的年代" },
      hint: { en: "By decade built", zh: "依建造年代" },
    },
  ],
  plants: [
    {
      key: "kinds",
      href: "/plants",
      icon: "guide",
      label: { en: "Tree kinds", zh: "樹的種類" },
      hint: { en: "A guide to each kind", zh: "每種樹的導覽" },
    },
    {
      key: "surveys",
      href: "/plants/surveys",
      icon: "trend",
      label: { en: "Counted year by year", zh: "逐年盤點" },
      hint: { en: "When the trees were surveyed", zh: "樹是哪一年調查的" },
    },
  ],
};
