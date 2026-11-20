import type { AtlasSection } from "@/lib/atlas-types";

export type L = { en: string; zh: string };
export type Track = "es" | "culture" | "both";

export interface LessonMeta {
  slug: string;
  subject: AtlasSection;
  track: Track;
  minutes: number;
  title: L;
  summary: L;
}

/** Small enough to import on any page; the full lessons are built on the server. */
export const lessonMeta: LessonMeta[] = [
  {
    slug: "air-quality-index",
    subject: "environment",
    track: "es",
    minutes: 45,
    title: {
      en: "Reading the Air Quality Index",
      zh: "讀懂空氣品質指標（AQI）",
    },
    summary: {
      en: "What AQI measures, how the official bands work, and why a county colour is only a summary of its stations.",
      zh: "AQI 測的是什麼、官方分級如何運作，以及為什麼縣市顏色只是測站的摘要。",
    },
  },
  {
    slug: "river-pollution-index",
    subject: "environment",
    track: "es",
    minutes: 50,
    title: {
      en: "Scoring a river: the River Pollution Index",
      zh: "替河川打分數：河川污染指數（RPI）",
    },
    summary: {
      en: "Compute an RPI by hand from four water measurements, then ask what a single averaged score hides.",
      zh: "用四項水質數據親手算出 RPI，再思考一個平均分數會掩蓋什麼。",
    },
  },
  {
    slug: "where-is-the-forest",
    subject: "forests",
    track: "es",
    minutes: 50,
    title: { en: "Where is the forest?", zh: "森林在哪裡？" },
    summary: {
      en: "Compare forest share with forest area by county, and learn what a one-year land-cover map can and cannot say.",
      zh: "比較各縣市的森林占比與森林面積，並理解單一年度土地覆蓋圖能說與不能說的事。",
    },
  },
  {
    slug: "roadkill-and-counting-effort",
    subject: "wildlife",
    track: "es",
    minutes: 55,
    title: {
      en: "Roadkill records and counting effort",
      zh: "路死紀錄與調查投入",
    },
    summary: {
      en: "Why more records do not mean more animals, and how to separate a real pattern from a change in how people looked.",
      zh: "為什麼紀錄變多不等於動物變多，以及如何分辨真實的模式與調查方式的改變。",
    },
  },
  {
    slug: "villages-and-places",
    subject: "culture",
    track: "culture",
    minutes: 55,
    title: {
      en: "Villages on a map: what a dot can and cannot say",
      zh: "地圖上的部落：一個點能說與不能說的事",
    },
    summary: {
      en: "Read public village reference points critically: who is listed, who is missing, and why a point is not a territory.",
      zh: "批判地閱讀公開部落定位點：誰被列入、誰沒有，以及為何一個點不等於傳統領域。",
    },
  },
  {
    slug: "urban-green-and-heat",
    subject: "urban",
    track: "both",
    minutes: 45,
    title: {
      en: "Urban trees and heat: a question the data cannot yet answer",
      zh: "都市樹木與熱：資料尚無法回答的問題",
    },
    summary: {
      en: "Use Taipei's park and tree inventories and measured temperatures to practise separating a good question from a supported claim.",
      zh: "運用臺北市公園與樹木清冊及實測氣溫，練習區分一個好問題與一項有證據支持的主張。",
    },
  },
  {
    slug: "audit-a-dataset",
    subject: "culture",
    track: "both",
    minutes: 40,
    title: { en: "Audit an open dataset", zh: "審視一份開放資料" },
    summary: {
      en: "A reusable worksheet for judging any dataset: who made it, what a record is, what is missing, and how it may be reused.",
      zh: "可重複使用的學習單：資料由誰製作、一筆紀錄是什麼、缺了什麼，以及如何再利用。",
    },
  },
];

export const trackLabel: Record<Track, L> = {
  es: { en: "Environmental science", zh: "環境科學" },
  culture: { en: "Cultural studies", zh: "文化研究" },
  both: { en: "Any course", zh: "各類課程" },
};

/** Lessons for a subject; the dataset audit suits every subject. */
export function lessonsFor(subject: AtlasSection) {
  return lessonMeta.filter(
    (lesson) => lesson.subject === subject || lesson.slug === "audit-a-dataset",
  );
}
