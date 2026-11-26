import type { Localized } from "@/lib/types";
import type { HistorySource } from "./history-types";
import raw from "./year-summaries.json";

/** The atlas's own dated records, counted by year. The numbers come from
 *  scripts/build-year-summaries.mjs, and tests/year-summaries.test.ts
 *  recounts them from the data files so they cannot drift. */
export interface WildlifeYear {
  year: number;
  records: number;
  /** Distinct animal kinds (taxa) seen that year. */
  taxa: number;
  byClass: Record<string, number>;
  /** Records per calendar month, January first. */
  byMonth: number[];
}
export interface CountyYears {
  code: string;
  name: Localized;
  total: number;
  byYear: Record<string, number>;
}
export interface ParkDecade {
  decade: number;
  parks: number;
  areaHa: number;
}
export interface SurveyYears {
  total: number;
  undated: number;
  byYear: Record<string, number>;
  firstDate: string;
  lastDate: string;
}
export interface NamedYear {
  en: string;
  zh: string;
  year: number;
}
export interface YearSummaries {
  wildlife: {
    records: number;
    years: WildlifeYear[];
    topCounties: CountyYears[];
  };
  parks: {
    total: number;
    withYear: number;
    withoutYear: number;
    byDecade: ParkDecade[];
    oldest: NamedYear;
    newest: NamedYear;
  };
  trees: { park: SurveyYears; riverside: SurveyYears };
}

export const yearSummaries = raw as unknown as YearSummaries;

/** The county code of Lienchiang, whose 2017 records dominate that year. */
export const LIENCHIANG = "09007";

export const wildlifeSources: HistorySource[] = [
  {
    id: "gbif-roadkill",
    title: {
      en: "The Taiwan Roadkill Observation Network Data Set, version 1.11",
      zh: "臺灣動物路死觀察網（Taiwan Roadkill Observation Network）資料集，1.11 版",
    },
    publisher:
      "Lin T (2026), Taiwan Biodiversity Research Institute, via GBIF; CC BY 4.0",
    url: "https://doi.org/10.15468/cidkqi",
    used: {
      en: "The source archive holds 46,416 records for 2011 to December 2017. This atlas publishes a privacy-screened subset of 10,841 records from 2014 to 2017, and counted every figure on this page from that subset.",
      zh: "來源資料共有 46,416 筆（2011 年至 2017 年 12 月）。本平台公開的是經隱私篩選的子集，共 10,841 筆（2014–2017 年），本頁所有數字都由這個子集計算。",
    },
  },
];

export const urbanSources: HistorySource[] = [
  {
    id: "taipei-parks",
    title: {
      en: "Parks, squares and green spaces (data.gov.tw 128366)",
      zh: "公園、廣場及綠地（data.gov.tw 128366）",
    },
    publisher: "Taipei City Government, Open Government Data License 1.0",
    url: "https://data.gov.tw/dataset/128366",
    used: {
      en: "812 parks with a reference point, 777 of them with a construction year; decade totals and average sizes were computed by this atlas.",
      zh: "812 座有參考點的公園，其中 777 座有開闢年份；各年代的座數與平均面積由本平台計算。",
    },
  },
  {
    id: "taipei-park-trees",
    title: {
      en: "Public park trees, Taipei (data.taipei)",
      zh: "臺北市公園樹木（data.taipei）",
    },
    publisher: "Taipei City Government, Open Government Data License 1.0",
    url: "https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8",
    used: {
      en: "85,177 accepted tree records dated 2016-06-02 to 2026-10-02; 481 have no valid date. Counts by survey year were computed by this atlas.",
      zh: "85,177 筆採用的樹木紀錄，日期介於 2016-06-02 至 2026-10-02；其中 481 筆沒有有效日期。各調查年的筆數由本平台計算。",
    },
  },
  {
    id: "taipei-riverside-trees",
    title: {
      en: "Riverside tree survey, Taipei (data.taipei)",
      zh: "臺北市河濱樹木調查（data.taipei）",
    },
    publisher: "Taipei City Government, Open Government Data License 1.0",
    url: "https://data.taipei/dataset/detail?id=34800b67-b5a5-4ce9-9892-eb0945b82644",
    used: {
      en: "10,735 accepted tree records from a one-time survey, 2016-11-04 to 2017-06-16; two have no valid date. The file was updated in 2023 without a new survey.",
      zh: "10,735 筆採用的樹木紀錄，來自一次性調查（2016-11-04 至 2017-06-16），其中 2 筆沒有有效日期。檔案於 2023 年更新，但並未重新調查。",
    },
  },
];
