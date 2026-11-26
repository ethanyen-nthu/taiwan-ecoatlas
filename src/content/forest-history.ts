import type { HistorySource } from "./history-types";

/**
 * Taiwan's forest cover in two national forest inventories, as the Forestry
 * Bureau (now the Forestry and Nature Conservation Agency) reports them.
 * The atlas's own 2023 map is a different method and is shown apart from them.
 */
export const forestSources: HistorySource[] = [
  {
    id: "fb-third",
    title: {
      en: "Forestry Bureau document: Taiwan's forest resources (3rd inventory figures)",
      zh: "林務局文件：臺灣森林資源現況（第 3 次調查數據）",
    },
    publisher: "Forestry Bureau, Council of Agriculture",
    url: "https://www.forest.gov.tw/file.aspx?fno=36085",
    used: {
      en: "3rd inventory (completed 1995): forest area 2,102,400 ha, 58.53% of 3,591,500 ha; areas by forest type.",
      zh: "第 3 次調查（1995 年完成）：森林面積 2,102,400 公頃，占全島 3,591,500 公頃的 58.53%；各林型面積。",
    },
  },
  {
    id: "fb-fourth",
    title: {
      en: "Forestry Bureau document: Taiwan's forest resources (4th inventory results)",
      zh: "林務局文件：臺灣森林資源現況（第 4 次調查成果）",
    },
    publisher: "Forestry Bureau, Council of Agriculture",
    url: "https://www.forest.gov.tw/File.aspx?fno=67987",
    used: {
      en: "4th inventory: forest area 2.197 million ha including Kinmen and Lienchiang; cover up from 58.53% to 60.71%, twice the global average of 30.3%; broadleaf 67%, conifer 14%, mixed 8%.",
      zh: "第 4 次調查：含金門、連江縣森林總面積 219.7 萬公頃；覆蓋率由 58.53% 升到 60.71%，是全球平均 30.3% 的兩倍；闊葉林 67%、針葉林 14%、針闊葉混淆林 8%。",
    },
  },
  {
    id: "fb-fourth-done",
    title: {
      en: "Forestry Bureau document, 2017 figures: forest resources and routine work",
      zh: "林務局文件（106 年數據）：森林資源現況及例行維護工作",
    },
    publisher: "Forestry Bureau, Council of Agriculture",
    url: "https://www.forest.gov.tw/File.aspx?fno=70400",
    used: {
      en: "The 4th inventory was completed in ROC year 104 (2015); the 4th-inventory type shares include 11% 'other'.",
      zh: "第 4 次全國森林資源調查於民國 104 年（2015 年）完成；第 4 次林型占比另有 11% 為「其他」。",
    },
  },
  {
    id: "fb-capita",
    title: {
      en: "Forestry Bureau document: findings of the 4th national forest inventory",
      zh: "林務局文件：第 4 次全國森林資源調查成果",
    },
    publisher: "Forestry Bureau, Council of Agriculture",
    url: "https://www.forest.gov.tw/File.aspx?fno=65373",
    used: {
      en: "Forest area per person fell from 0.199 ha (1st inventory, 1957) to 0.092 ha as the population grew about 2.5 times; plantation forest is 66,000 ha smaller than in the 3rd inventory, partly because some plantations are degrading as secondary forest grows in.",
      zh: "每人森林面積由第 1 次調查（1957 年）的 0.199 公頃降到 0.092 公頃，因人口增加約 2.5 倍；人工林較第 3 次調查減少 6.6 萬公頃，部分人工林逐漸退化、次生林木入侵。",
    },
  },
  {
    id: "atlas-2023",
    title: {
      en: "Taiwan land cover 2023 (research classification)",
      zh: "臺灣 2023 年土地覆蓋（研究分類）",
    },
    publisher:
      "Zenodo record 14033363, CC BY 4.0; county totals computed by this atlas",
    url: "https://zenodo.org/records/14033363",
    used: {
      en: "The atlas's 2023 map: forest is 58.4% of the 36,384 km² mapped in 19 counties. Kinmen, Lienchiang and Penghu are not mapped.",
      zh: "本平台的 2023 年地圖：19 個縣市已繪製的 36,384 平方公里中，森林占 58.4%；金門、連江與澎湖未繪製。",
    },
  },
];

export interface Inventory {
  id: "third" | "fourth";
  completed: number;
  /** Published forest cover, percent of land area. */
  coverPct: number;
  forestHa: number;
  /** True when Kinmen and Lienchiang are inside the figure. */
  withOutlyingIslands: boolean;
  sources: string[];
}
export const inventories: Inventory[] = [
  {
    id: "third",
    completed: 1995,
    coverPct: 58.53,
    forestHa: 2_102_400,
    withOutlyingIslands: false,
    sources: ["fb-third"],
  },
  {
    id: "fourth",
    completed: 2015,
    coverPct: 60.71,
    forestHa: 2_197_000,
    withOutlyingIslands: true,
    sources: ["fb-fourth", "fb-fourth-done"],
  },
];

/** Island land area the 3rd inventory divided by. */
export const thirdIslandHa = 3_591_500;

/** Forest type areas in the 3rd inventory, hectares. */
export const thirdTypesHa = {
  broadleaf: 1_120_400,
  conifer: 438_500,
  mixed: 391_200,
  bamboo: 152_300,
};
/** Forest type shares in the 4th inventory, percent as published. */
export const fourthTypesPct = {
  broadleaf: 67,
  conifer: 14,
  mixed: 8,
  other: 11,
};

export const perPerson = {
  first: { year: 1957, ha: 0.199 },
  fourth: { ha: 0.092 },
  sources: ["fb-capita"],
};
export const plantationChangeHa = -66_000;
export const globalAverageCoverPct = 30.3;

/** This atlas's own 2023 map, summed over mapped counties. */
export const atlas2023 = {
  forestKm2: 21258.1,
  mappedKm2: 36383.6,
  countiesMapped: 19,
  sources: ["atlas-2023"],
};

export const sharePct = (part: number, whole: number) => (part / whole) * 100;
