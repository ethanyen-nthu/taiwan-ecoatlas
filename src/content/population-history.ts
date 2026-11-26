import type { HistorySource } from "./history-types";

/**
 * People registered with Indigenous status, at year-end, from the Ministry of
 * the Interior's household-registration statistics. Only year-ends that could
 * be traced to a published table are listed; the years between exist at the
 * ministry and are not copied here.
 */
export const populationSources: HistorySource[] = [
  {
    id: "moi-2026",
    title: {
      en: "MOI statistical bulletin, week 8 of 2026: Indigenous population at end-2025",
      zh: "115 年第 8 週內政統計通報：114 年底原住民人口數",
    },
    publisher: "Ministry of the Interior, Department of Statistics",
    url: "https://www.moi.gov.tw/News_Content.aspx?n=2905&s=336847",
    used: {
      en: "End-2025: 629,456 registered Indigenous people (2.7% of the population, up 2.9% on end-2024); by people, by region, by age; the 26 peoples are the 16 legally recognised plus 10 Plains peoples.",
      zh: "2025 年底：戶籍登記原住民 629,456 人（占全國人口 2.7%，較 2024 年底增加 2.9%）；族別、地區、年齡結構；26 族為法定 16 族加平埔 10 族。",
    },
  },
  {
    id: "taichung-2021",
    title: {
      en: "Taichung City statistical bulletin 110-03-01: the Indigenous population",
      zh: "臺中市統計通報 110-03-01：原住民族人口概況",
    },
    publisher:
      "Taichung City Government (Civil Affairs Bureau and Accounting and Statistics Office), using Ministry of the Interior data",
    url: "https://www.civil.taichung.gov.tw/media/658774/110-03-1-%E5%8E%9F%E4%BD%8F%E6%B0%91%E6%97%8F%E4%BA%BA%E5%8F%A3%E6%A6%82%E6%B3%81-%E6%B0%91%E6%94%BF%E5%B1%80.pdf",
    used: {
      en: "The national row of its table: 519,984 Indigenous people at end-2011 (2.24% of 23,224,912) and 576,792 at end-2020 (2.45% of 23,561,236); growth of 10.92% against 1.45% for the whole population.",
      zh: "其表格的全國列：2011 年底原住民 519,984 人（占 23,224,912 人的 2.24%）、2020 年底 576,792 人（占 23,561,236 人的 2.45%）；成長 10.92%，全體人口成長 1.45%。",
    },
  },
  {
    id: "data-9605",
    title: {
      en: "Indigenous population by area (open data, monthly since January 1999)",
      zh: "原住民人口—按區域別分（開放資料，自 1999 年 1 月起逐月）",
    },
    publisher: "data.gov.tw, Ministry of the Interior",
    url: "https://data.gov.tw/dataset/9605",
    used: {
      en: "Where every year in between can be downloaded.",
      zh: "可下載中間每一年的資料。",
    },
  },
];

export interface YearEnd {
  year: number;
  people: number;
  /** Percent of the national population, as published. */
  sharePct: number;
  nation: number | null;
  sources: string[];
}
export const yearEnds: YearEnd[] = [
  {
    year: 2011,
    people: 519_984,
    sharePct: 2.24,
    nation: 23_224_912,
    sources: ["taichung-2021"],
  },
  {
    year: 2020,
    people: 576_792,
    sharePct: 2.45,
    nation: 23_561_236,
    sources: ["taichung-2021"],
  },
  {
    year: 2025,
    people: 629_456,
    sharePct: 2.7,
    nation: null,
    sources: ["moi-2026"],
  },
];

/** Growth the Taichung bulletin prints for 2011 to 2020, percent. */
export const publishedGrowth2011to2020 = { indigenous: 10.92, nation: 1.45 };

export const end2025 = {
  mountain: 335_470,
  plains: 293_986,
  female: 325_070,
  male: 304_386,
  medianAge: 34.9,
  nationalMedianAge: 45.7,
  risePct: 2.9,
  sources: ["moi-2026"],
};

export const peoples2025 = [
  { key: "amis", en: "Amis", zh: "阿美族", people: 234_661, sharePct: 37.3 },
  {
    key: "paiwan",
    en: "Paiwan",
    zh: "排灣族",
    people: 114_081,
    sharePct: 18.1,
  },
  {
    key: "atayal",
    en: "Atayal",
    zh: "泰雅族",
    people: 102_638,
    sharePct: 16.3,
  },
];

export const places2025 = [
  {
    key: "hualien",
    en: "Hualien County",
    zh: "花蓮縣",
    people: 94_924,
    sharePct: 15.1,
  },
  {
    key: "taoyuan",
    en: "Taoyuan City",
    zh: "桃園市",
    people: 90_247,
    sharePct: 14.3,
  },
  {
    key: "taitung",
    en: "Taitung County",
    zh: "臺東縣",
    people: 79_340,
    sharePct: 12.6,
  },
];
/** Share of each county's own residents who are registered Indigenous, as the
 *  ministry ranks them: Taitung highest, Hualien second, Pingtung third. */
export const ownShares = [
  { key: "taitung", en: "Taitung County", zh: "臺東縣", sharePct: 38.1 },
  { key: "hualien", en: "Hualien County", zh: "花蓮縣", sharePct: 30.3 },
  { key: "pingtung", en: "Pingtung County", zh: "屏東縣", sharePct: 8.1 },
];
export const taitungOwnShare = 38.1;

/** The ministry's 2025 note on the 26 peoples: 16 legally recognised and 10
 *  Plains peoples, whose registration waits on recognition. */
export const plainsRegistration = {
  lawPromulgated: "2025-10-23",
  applied: 9,
  ofTen: 10,
};
