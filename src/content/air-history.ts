/**
 * Long-run fine-particle (PM2.5) record for Taiwan, compiled by hand from
 * published Ministry of Environment figures. Nothing here is live: the
 * atlas has no persistent air archive, so every number below is traceable to
 * one of the documents in `airSources`.
 *
 * All values are the ministry's national annual average from its standard
 * (manual, 24-hour filter) method at 31 stations, in µg/m³. Years whose
 * published figures disagree between releases are left out rather than guessed.
 */
export type L = { en: string; zh: string };

export interface AirSource {
  id: string;
  title: L;
  publisher: string;
  url: string;
  used: L;
}

export const airSources: AirSource[] = [
  {
    id: "moenv-county",
    title: {
      en: "Air pollutant concentrations by county (open-data table)",
      zh: "空氣污染物濃度測值（縣市別，開放資料）",
    },
    publisher: "Ministry of Environment, via data.gov.tw (dataset 89030)",
    url: "https://data.gov.tw/dataset/89030",
    used: {
      en: "County PM2.5 annual averages from automatic stations, 2021 to 2025, for the county map only.",
      zh: "各縣市自動測站 PM2.5 年平均，2021 至 2025 年，僅用於縣市地圖。",
    },
  },
  {
    id: "review",
    title: {
      en: "2025 national air-pollution review (reported by CNA)",
      zh: "114 年度空氣污染防制總檢討（中央社報導）",
    },
    publisher: "Ministry of Environment via The News Lens",
    url: "https://www.thenewslens.com/article/268699",
    used: {
      en: "2013 = 24.0 and 2025 = 12.8; the 47% fall.",
      zh: "2013 年 24.0、2025 年 12.8；改善 47%。",
    },
  },
  {
    id: "table",
    title: {
      en: "Annual PM2.5 table, 31 manual stations, 2013–2019 totals",
      zh: "細懸浮微粒手動監測年平均濃度表（31 站），2013–2019 年總計",
    },
    publisher: "Social and Family Affairs Administration (ministry data)",
    url: "https://crc.sfaa.gov.tw/Uploadfile/Statiscs/80_20250901123010_7919477.pdf",
    used: {
      en: "National totals for 2013 to 2019.",
      zh: "2013 至 2019 年全國總計。",
    },
  },
  {
    id: "ey-goals",
    title: {
      en: "Executive Yuan: Air Pollution Control Action Plan results",
      zh: "行政院：空氣污染防制行動方案成果",
    },
    publisher: "Executive Yuan",
    url: "https://www.ey.gov.tw/Goals/81689F916EB5D550",
    used: {
      en: "2019 = 16.2; PM2.5 red alerts 997 (2015) to 146 (2019).",
      zh: "2019 年 16.2；PM2.5 紅色警示由 2015 年 997 次降至 2019 年 146 次。",
    },
  },
  {
    id: "ey-hr",
    title: {
      en: "Executive Yuan human-rights indicator 23: PM2.5 annual average",
      zh: "行政院人權指標 23：細懸浮微粒年平均濃度",
    },
    publisher: "Executive Yuan, with the Ministry of Environment",
    url: "https://www.ey.gov.tw/File/2C48FA7CB5FCE458?A=C",
    used: {
      en: "2024 = 12.8 and 2025 = 12.8.",
      zh: "2024 年與 2025 年皆為 12.8。",
    },
  },
  {
    id: "focus",
    title: {
      en: "Environment ministry sets 2035 PM2.5 standard at 8 micrograms",
      zh: "環境部訂定 2035 年 PM2.5 標準為 8 微克",
    },
    publisher: "Focus Taiwan (CNA)",
    url: "https://focustaiwan.tw/society/202505160013",
    used: {
      en: "2016 = 20.0 and 2024 = 12.8, as stated by the minister.",
      zh: "部長說明 2016 年 20.0、2024 年 12.8。",
    },
  },
  {
    id: "ocac",
    title: {
      en: "Taiwan's PM2.5 in 2023, ministry data versus IQAir",
      zh: "2023 年臺灣 PM2.5：環境部數據與 IQAir 比較",
    },
    publisher: "OCAC News",
    url: "https://ocacnews.net/article/365112",
    used: {
      en: "2022 = 12.4 and 2023 = 13.7.",
      zh: "2022 年 12.4、2023 年 13.7。",
    },
  },
  {
    id: "region-2019",
    title: {
      en: "Ministry: foreign ranking misreads how Taiwan's air is measured",
      zh: "環境部：國外報告空品排名定義遭誤解",
    },
    publisher: "UDN, quoting the Ministry of Environment",
    url: "https://udn.com/news/story/7266/9402567",
    used: {
      en: "Central and southern Taiwan 19.6 (2019) to 14.8 (2025); the ministry's reason its method differs from IQAir.",
      zh: "中南部 2019 年 19.6 降至 2025 年 14.8；環境部說明與 IQAir 方法不同。",
    },
  },
  {
    id: "region-2016",
    title: {
      en: "Ministry answers the Southern Taiwan Anti-Air Pollution Alliance",
      zh: "環境部回應南部反空污聯盟",
    },
    publisher: "Taipei Times",
    url: "https://taipeitimes.com/News/taiwan/archives/2023/12/11/2003810461",
    used: {
      en: "Central and southern Taiwan 23.7 in 2016.",
      zh: "中南部 2016 年 23.7。",
    },
  },
  {
    id: "standard",
    title: {
      en: "Air quality standard tightened on 30 September 2024",
      zh: "2024 年 9 月 30 日修正空氣品質標準",
    },
    publisher: "NOWnews, quoting the Ministry of Environment",
    url: "https://www.nownews.com/news/6539552",
    used: {
      en: "Annual PM2.5 standard 15 to 12 µg/m³, target year 2030; autumn-winter red alerts 217 (2018 season) to 16 (2023).",
      zh: "PM2.5 年平均標準由 15 加嚴為 12；預計 2030 年達標；秋冬紅色警示由 107 年 217 站日降至 112 年 16 站日。",
    },
  },
  {
    id: "who",
    title: {
      en: "Taiwan aims for 8 µg/m³ by 2035; WHO guideline is 5",
      zh: "臺灣 2035 年目標 8 微克；世界衛生組織建議值為 5",
    },
    publisher: "Taiwan News",
    url: "https://www.taiwannews.com.tw/news/6023038",
    used: {
      en: "The WHO annual guideline of 5 µg/m³.",
      zh: "世界衛生組織年平均建議值 5。",
    },
  },
  {
    id: "cna-2020",
    title: {
      en: "2020 air quality report: PM2.5 down, ozone up",
      zh: "2020 年空氣品質報告：PM2.5 下降、臭氧增加",
    },
    publisher: "CNA via Global Views Monthly",
    url: "https://www.gvm.com.tw/article/76908",
    used: {
      en: "15 PM2.5 red alerts by 20 December 2020; upwind pollution roughly halved in early 2020; ozone became the main pollutant on unhealthy days from 2019.",
      zh: "2020 年至 12 月 20 日 PM2.5 紅色警示 15 次；上半年境外傳輸約減半；2019 年起臭氧為空品不良主要污染物。",
    },
  },
  {
    id: "iqair",
    title: {
      en: "IQAir ranking and the ministry's average, 2025",
      zh: "IQAir 排名與環境部 2025 年平均",
    },
    publisher: "Taipei Times",
    url: "https://www.taipeitimes.com/News/front/archives/2026/03/26/2003854484",
    used: {
      en: "IQAir 13.3 for 2025 against the ministry's 12.8.",
      zh: "IQAir 2025 年 13.3，環境部 12.8。",
    },
  },
  {
    id: "ozone-2025",
    title: {
      en: "2025 air quality review: PM2.5 steady, ozone slightly up",
      zh: "2025 年空品回顧：PM2.5 持平、臭氧略升",
    },
    publisher: "Taipei Times",
    url: "https://www.taipeitimes.com/News/taiwan/archives/2025/12/31/2003849829",
    used: {
      en: "Average hourly ozone up 2 percent on 2024.",
      zh: "2025 年每小時臭氧平均較 2024 年上升 2%。",
    },
  },
  {
    id: "aqi-change",
    title: {
      en: "Statistics notice: AQI cut-offs revised from January 2025",
      zh: "統計公告：2025 年 1 月起調整 AQI 分段點",
    },
    publisher: "Ministry of Environment (Statistics)",
    url: "https://www.stat.gov.tw/News_NoticeCalendar_Content.aspx?Ln=1&MetaI_D=2006",
    used: {
      en: "AQI cut-offs were recalculated back to 2020 only.",
      zh: "AQI 分段點僅回溯計算至 2020 年。",
    },
  },
  {
    id: "yunlin",
    title: {
      en: "Yunlin County highest again in 2023 (ministry data)",
      zh: "2023 年雲林縣再度最高（環境部資料）",
    },
    publisher: "Taipei Times",
    url: "https://www.taipeitimes.com/News/front/archives/2024/03/25/2003815427",
    used: { en: "Yunlin 19.3 in 2023.", zh: "雲林縣 2023 年 19.3。" },
  },
  {
    id: "county-2013",
    title: {
      en: "PM2.5 annual averages by county, 2013 onward (EPA data)",
      zh: "各縣市細懸浮微粒年平均濃度，2013 年起（環保署資料）",
    },
    publisher: "New Taipei City Environmental Protection Department",
    url: "https://www.epd.ntpc.gov.tw/UploadFile/InformationDisclosure/20180629144604112949.pdf",
    used: {
      en: "Yunlin 34.0 and Taitung 10.9 in 2013.",
      zh: "雲林縣 2013 年 34.0、臺東縣 10.9。",
    },
  },
];

export interface AirPoint {
  year: number;
  value: number;
  /** ids in `airSources` that state this value */
  sources: string[];
}

/** National annual average PM2.5, µg/m³. 2020 and 2021 are deliberately absent. */
export const nationalPm25: AirPoint[] = [
  { year: 2013, value: 24.0, sources: ["review", "table"] },
  { year: 2014, value: 23.6, sources: ["table"] },
  { year: 2015, value: 22.0, sources: ["table"] },
  { year: 2016, value: 20.0, sources: ["table", "focus"] },
  { year: 2017, value: 18.3, sources: ["table"] },
  { year: 2018, value: 17.5, sources: ["table"] },
  { year: 2019, value: 16.2, sources: ["table", "ey-goals", "region-2019"] },
  { year: 2022, value: 12.4, sources: ["ocac"] },
  { year: 2023, value: 13.7, sources: ["ocac"] },
  { year: 2024, value: 12.8, sources: ["focus", "ey-hr"] },
  { year: 2025, value: 12.8, sources: ["review", "ey-hr", "region-2019"] },
];

/** Central and southern Taiwan, as the ministry reported it for selected years. */
export const centralSouthPm25: AirPoint[] = [
  { year: 2016, value: 23.7, sources: ["region-2016"] },
  { year: 2019, value: 19.6, sources: ["region-2019"] },
  { year: 2025, value: 14.8, sources: ["region-2019"] },
];

/** Years in the span that are not plotted, and why (shown in the table). */
export const gapYears = [2020, 2021];

export const yearSpan = { first: 2013, last: 2025 };

export interface Yardstick {
  id: string;
  value: number;
  label: { en: string; zh: string };
  short: { en: string; zh: string };
  sources: string[];
  dashed?: boolean;
}

/** Reference lines drawn on the chart. */
export const yardsticks: Yardstick[] = [
  {
    id: "old-standard",
    value: 15,
    label: {
      en: "Taiwan standard until Sept 2024 · 15",
      zh: "2024 年 9 月前的標準 · 15",
    },
    short: { en: "Old standard · 15", zh: "舊標準 · 15" },
    sources: ["standard"],
  },
  {
    id: "standard",
    value: 12,
    label: {
      en: "Taiwan standard since Sept 2024 · 12",
      zh: "2024 年 9 月起的標準 · 12",
    },
    short: { en: "New standard · 12", zh: "新標準 · 12" },
    sources: ["standard"],
  },
  {
    id: "who",
    value: 5,
    label: { en: "WHO guideline · 5", zh: "世界衛生組織建議值 · 5" },
    short: { en: "WHO · 5", zh: "WHO · 5" },
    sources: ["who"],
    dashed: true,
  },
];

export const redAlerts = [
  { year: 2015, count: 997, sources: ["ey-goals"] },
  { year: 2019, count: 146, sources: ["ey-goals"] },
] as const;

/** Whole-number percentage change from the first to the last plotted year. */
export function percentChange(from: number, to: number): number {
  return Math.round(((to - from) / from) * 100);
}

export function sourceById(id: string): AirSource | undefined {
  return airSources.find((source) => source.id === id);
}
