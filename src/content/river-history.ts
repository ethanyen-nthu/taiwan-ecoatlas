import type { HistorySource } from "./history-types";

/**
 * River pollution, 2002 to 2025, from Ministry of Environment statements.
 * Only years that appear in a ministry statement could be traced, so the years
 * between are not drawn. Every figure carries the ids of the sources below.
 */
export const riverSources: HistorySource[] = [
  {
    id: "moenv-2026",
    title: {
      en: "Twenty years of river clean-up: severely polluted stations down to 2",
      zh: "河川治理20餘年 嚴重污染測站剩2站創新低",
    },
    publisher:
      "UDN, reporting a Ministry of Environment briefing of 31 March 2026",
    url: "https://udn.com/news/story/7266/9413826",
    used: {
      en: "66 severely polluted stations in 2002, when the ministry counted 293 stations, and 2 in 2025; severely polluted length 14% to 1.9%; the aim of zero by 2030; about 30% of rivers with less stable water quality.",
      zh: "2002 年有 66 站嚴重污染（當年監測站共 293 站），2025 年剩 2 站；嚴重污染長度由 14% 降到 1.9%；2030 年目標歸零；約三成河川水質較不穩定。",
    },
  },
  {
    id: "ey-1-9",
    title: {
      en: "Executive Yuan: national water-quality monitoring and clean-up",
      zh: "行政院：環境部全國水質監測與治理",
    },
    publisher: "Executive Yuan, citing the Ministry of Environment",
    url: "https://www.ey.gov.tw/Page/88F151FFCE5C741E/daa202ec-5ce4-4b6b-b95f-70dc15b94e02",
    used: {
      en: "The severely polluted share of river length fell to 1.9%, the lowest on record.",
      zh: "河川嚴重污染長度比率下降至 1.9%，創歷年最低紀錄。",
    },
  },
  {
    id: "pts-2024",
    title: {
      en: "New Huwei River station worst in Taiwan; Yunlin says tides matter",
      zh: "新虎尾溪蚊港橋站水質全台最差 雲縣:受潮汐影響大",
    },
    publisher:
      "Public Television Service (PTS), on the ministry's 2024 river results",
    url: "https://news.pts.org.tw/article/738267",
    used: {
      en: "In 2024, 7 of 303 water-quality stations were severely polluted.",
      zh: "2024 年全臺 303 個水質測站中，有 7 站嚴重污染。",
    },
  },
  {
    id: "pts-2021",
    title: {
      en: "Last year's drought lengthened polluted river reaches",
      zh: "去年大旱基流量減少 稀釋能力差致河川汙染段變長",
    },
    publisher:
      "Public Television Service (PTS), quoting the Environmental Protection Administration",
    url: "https://news.pts.org.tw/article/606146",
    used: {
      en: "In the 2021 drought the severely polluted stretch of the Beigang River grew from 11.75 to 19.7 km; the agency said the daily load of the indicator pollutant BOD fell from about 1,200 tonnes (2002) to about 569 tonnes (around 2021).",
      zh: "2021 年大旱，北港溪嚴重污染河段由 11.75 公里增加到 19.7 公里；環保署指出，指標污染物（BOD）每日排入量由 2002 年約 1,200 公噸降到 2021 年前後約 569 公噸。",
    },
  },
  {
    id: "pts-2023",
    title: {
      en: "Moderate pollution rises in the Zengwen and Jishui rivers",
      zh: "曾文溪與急水溪中度污染增 民代籲設截流裝置",
    },
    publisher:
      "Public Television Service (PTS), quoting the Tainan Environmental Protection Bureau",
    url: "https://news.pts.org.tw/article/687187",
    used: {
      en: "In Tainan's report on 2023, the moderately polluted share of the Jishui River rose from 27.7% to 54.76%, while the severely polluted reaches of the Erren and Yanshui rivers shortened slightly.",
      zh: "臺南市 2023 年的報告指出，急水溪的中度污染比例由 27.7% 升到 54.76%，而二仁溪、鹽水溪的重度污染河段則略為縮短。",
    },
  },
  {
    id: "ctee-2025",
    title: {
      en: "Tamsui River turns around: polluted length cut to 0.5%",
      zh: "淡水河大翻身!新北整治有成 污染長度縮減至0.5%",
    },
    publisher:
      "Commercial Times, citing the New Taipei City Environmental Protection Department",
    url: "https://www.ctee.com.tw/news/20250225701040-431401",
    used: {
      en: "The severely polluted length of the Tamsui River was 0.5% in 2024; New Taipei's sewer connection rate rose from 28% in 2011 to over 72% in 2024.",
      zh: "2024 年淡水河嚴重污染長度縮減至 0.5%；新北市污水接管率由 2011 年的 28% 升到 2024 年的 72% 以上。",
    },
  },
  {
    id: "pts-ammonia",
    title: {
      en: "Ammonia-nitrogen compliance low; ministry plans to charge for it",
      zh: "河川氨氮污染達標率低 環境部擬納管水污費收費項目",
    },
    publisher:
      "Public Television Service (PTS), quoting the Ministry of Environment",
    url: "https://news.pts.org.tw/article/723881",
    used: {
      en: "Ammonia nitrogen is the river measure with the lowest compliance rate, under 60% for three years running.",
      zh: "氨氮是河川水質達成率最差的項目，已連續 3 年未達 6 成。",
    },
  },
  {
    id: "data-6512",
    title: {
      en: "Important rivers' pollution, by river and year (open data)",
      zh: "重要河川污染情形（開放資料）",
    },
    publisher: "data.gov.tw, from the Environmental Protection Administration",
    url: "https://data.gov.tw/dataset/6512",
    used: {
      en: "Where the full yearly table by river lives: it splits each river into unpolluted or slightly, lightly, moderately and severely polluted length.",
      zh: "完整的逐年、逐河川資料表所在處：每條河川分為未（稍）受污染、輕度、中度與嚴重污染長度。",
    },
  },
];

export interface StationPoint {
  year: number;
  count: number;
  /** The network size the source gives for that year, when it gives one. */
  of: number | null;
  sources: string[];
}
/** Severely polluted monitoring stations, as published. The network is not
 *  the same size every year, so these are never turned into a share. */
export const severeStations: StationPoint[] = [
  { year: 2002, count: 66, of: 293, sources: ["moenv-2026"] },
  { year: 2024, count: 7, of: 303, sources: ["pts-2024"] },
  { year: 2025, count: 2, of: null, sources: ["moenv-2026"] },
];

export interface LengthPoint {
  year: number;
  percent: number;
  sources: string[];
}
/** Share of river length that is severely polluted. */
export const severeLength: LengthPoint[] = [
  { year: 2002, percent: 14, sources: ["moenv-2026"] },
  { year: 2025, percent: 1.9, sources: ["moenv-2026", "ey-1-9"] },
];

export const bodLoad = {
  from: { year: 2002, tonnesPerDay: 1200 },
  to: { year: 2021, tonnesPerDay: 569 },
  sources: ["pts-2021"],
};

export const drought2021 = {
  river: "Beigang River",
  fromKm: 11.75,
  toKm: 19.7,
  sources: ["pts-2021"],
};
