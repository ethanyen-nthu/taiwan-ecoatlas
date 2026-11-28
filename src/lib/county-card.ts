import { baselinePeriod, degrees, type Period } from "./temperature-history";
import type { CountyRef, Tour } from "./tour";

/**
 * What one county's card says: the six findings of the tour, for one county.
 * Both the printable card and the share image (the picture LINE shows under a
 * link) are built from this, so they cannot disagree with the tour or with
 * each other. A figure the atlas does not have is null, never zero, and
 * is printed as a dash.
 */
export interface Place {
  /** 1 is the highest figure. */
  n: number;
  /** Counties that have a figure. */
  of: number;
}
export interface CountyCardData {
  code: string;
  en: string;
  zh: string;
  air: { value: number | null; year: number; place: Place | null };
  warm: {
    change: number | null;
    early: Period;
    late: Period;
    place: Place | null;
  };
  forest: { sharePct: number | null; year: number; place: Place | null };
  roadkill: {
    count: number | null;
    first: number;
    last: number;
    place: Place | null;
  };
  villages: { count: number; place: Place | null };
  /** Only Taipei City has the park and tree inventories. */
  taipei: { parks: number; trees: number; kinds: number } | null;
}

/** Where a county stands among those that have a figure. Counties with the
 *  same figure share a place. */
export function placeOf(
  values: Record<string, number | null>,
  code: string,
): Place | null {
  const mine = values[code];
  if (mine === null || mine === undefined) return null;
  const all = Object.values(values).filter(
    (value): value is number => value !== null,
  );
  return { n: all.filter((value) => value > mine).length + 1, of: all.length };
}

export function countyCard(
  tour: Tour,
  counties: CountyRef[],
  code: string,
): CountyCardData | null {
  const county = counties.find((item) => item.code === code);
  if (!county) return null;
  const { air, warm, forest, roadkill, people, taipei } = tour;
  const zeroToNull = (values: Record<string, number | null>) =>
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === 0 ? null : value,
      ]),
    );
  const villages = zeroToNull(people.layer.values);
  return {
    code,
    en: county.en,
    zh: county.zh,
    air: {
      value: air.layer.values[code] ?? null,
      year: air.facts.mapYear,
      place: placeOf(air.layer.values, code),
    },
    warm: {
      change: warm.layer.values[code] ?? null,
      early: warm.facts.early,
      late: warm.facts.late,
      place: placeOf(warm.layer.values, code),
    },
    forest: {
      sharePct: forest.layer.values[code] ?? null,
      year: forest.facts.year,
      place: placeOf(forest.layer.values, code),
    },
    roadkill: {
      count: roadkill.layer.values[code] ?? null,
      first: roadkill.facts.firstYear,
      last: roadkill.facts.lastYear,
      place: placeOf(roadkill.layer.values, code),
    },
    villages: {
      count: people.layer.values[code] ?? 0,
      place: placeOf(villages, code),
    },
    taipei: code === taipei.facts.code ? { ...taipei.facts } : null,
  };
}

// ------------------------------------------------------------- the words --

export type CardLanguage = "en" | "zh";
export type CardTone =
  "environment" | "forests" | "wildlife" | "culture" | "urban";

/** One row of the printed card. `value` is null where there is no figure. */
export interface CardRow {
  id: "air" | "warm" | "forest" | "roadkill" | "villages" | "taipei";
  tone: CardTone;
  subject: string;
  heading: string;
  value: string | null;
  /** Said where there is no figure, in place of the value. */
  gap: string;
  place: string | null;
  what: string;
  cannot: string;
  source: string;
}

const grouped = (value: number) => value.toLocaleString("en-US");
const ordinal = (n: number) => {
  const mod = n % 100;
  if (mod >= 11 && mod <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
};
const placeText = (
  place: Place | null,
  language: CardLanguage,
  of: { en: string; zh: string },
) =>
  place
    ? language === "en"
      ? `${ordinal(place.n)} highest of ${place.of} counties ${of.en}`
      : `${place.of} 個${of.zh}中第 ${place.n} 高`
    : null;

/** The six rows of the card, in the order of the tour. Taipei's own row is
 *  filled only for Taipei City; elsewhere it is a dash that says why. */
export function cardRows(
  data: CountyCardData,
  language: CardLanguage,
): CardRow[] {
  const en = language === "en";
  const t = (english: string, chinese: string) => (en ? english : chinese);
  const years = (period: Period) => `${period.from}–${period.to}`;
  return [
    {
      id: "air",
      tone: "environment",
      subject: t("Air", "空氣"),
      heading: t(
        `PM2.5, yearly average, ${data.air.year}`,
        `PM2.5 年平均（${data.air.year}）`,
      ),
      value: data.air.value === null ? null : `${data.air.value} µg/m³`,
      gap: t("No figure for this county", "此縣市沒有數字"),
      place: placeText(data.air.place, language, {
        en: "(highest means more polluted)",
        zh: "（愈高表示污染愈重）",
      }),
      what: t(
        "The ministry’s average over the county’s automatic air stations for the whole year.",
        "環境部對縣市內自動測站全年的平均。",
      ),
      cannot: t(
        "Stations stand where people live, not evenly across a county, and one average hides local peaks.",
        "測站多設在人口集中處，並非均勻分布；一個平均數會掩蓋局部高值。",
      ),
      source: t(
        "Ministry of Environment, county annual averages",
        "環境部縣市年平均資料",
      ),
    },
    {
      id: "warm",
      tone: "environment",
      subject: t("Temperature", "氣溫"),
      heading: t(
        `Yearly mean, ${years(data.warm.late)} compared with ${years(data.warm.early)}`,
        `年平均氣溫，${years(data.warm.late)} 對照 ${years(data.warm.early)}`,
      ),
      value:
        data.warm.change === null
          ? null
          : `${degrees(data.warm.change, true)} °C`,
      gap: t("The model has no value for this county", "模式在此縣市沒有數值"),
      place: placeText(data.warm.place, language, {
        en: "(highest means warmed most)",
        zh: "（愈高表示升溫愈多）",
      }),
      what: t(
        "A reanalysis model (ERA5-Land, about 10 km squares) read at the county’s main town.",
        "再分析模式（ERA5-Land，約 10 公里網格），取縣市主要城鎮位置。",
      ),
      cannot: t(
        "A model estimate, not a thermometer record; one square stands for the whole county.",
        "這是模式估計，不是溫度計紀錄；一個網格代表整個縣市。",
      ),
      source: t(
        "Open-Meteo, ERA5-Land (CC BY 4.0)",
        "Open-Meteo，ERA5-Land（CC BY 4.0）",
      ),
    },
    {
      id: "forest",
      tone: "forests",
      subject: t("Forests", "森林"),
      heading: t(
        `Forest share of mapped land, ${data.forest.year}`,
        `森林占已繪製土地的比例（${data.forest.year}）`,
      ),
      value: data.forest.sharePct === null ? null : `${data.forest.sharePct}%`,
      gap: t(
        "Not covered by the 2023 classification",
        "2023 年分類未涵蓋此縣市",
      ),
      place: placeText(data.forest.place, language, {
        en: "with a figure",
        zh: "有數字的縣市",
      }),
      what: t(
        "Counted in original pixels from a 2023 land-cover classification.",
        "以原始像元計算，取自 2023 年土地覆蓋分類。",
      ),
      cannot: t(
        "Forest is a land-cover class. It does not say how old, how healthy or how protected the trees are.",
        "「森林」是土地覆蓋類別，無法說明樹木的年齡、健康或保護狀況。",
      ),
      source: t(
        "Chen et al., Taiwan land cover data v3 (CC BY 4.0)",
        "Chen 等，臺灣土地覆蓋資料 v3（CC BY 4.0）",
      ),
    },
    {
      id: "roadkill",
      tone: "wildlife",
      subject: t("Wildlife", "野生動物"),
      heading: t(
        `Roadkill reports, ${data.roadkill.first}–${data.roadkill.last}`,
        `路死通報，${data.roadkill.first}–${data.roadkill.last}`,
      ),
      value: data.roadkill.count === null ? null : grouped(data.roadkill.count),
      gap: t(
        "No reports from this county in the published subset",
        "公開子集中此縣市沒有通報",
      ),
      place: placeText(data.roadkill.place, language, {
        en: "with reports",
        zh: "有通報的縣市",
      }),
      what: t(
        "Screened reports in a published subset, placed on a 10 km grid.",
        "公開子集中經篩選的通報，位置以 10 公里網格表示。",
      ),
      cannot: t(
        "Counts follow how much people reported and how the data were screened, not how many animals there are or how risky a road is.",
        "數量反映通報多寡與篩選方式，不代表動物數量或道路風險。",
      ),
      source: t(
        "Taiwan Roadkill Observation Network, TBRI (CC BY 4.0)",
        "臺灣動物路死觀察網，特生中心（CC BY 4.0）",
      ),
    },
    {
      id: "villages",
      tone: "culture",
      subject: t("Peoples", "族群"),
      heading: t(
        "Villages in the Indigenous village list",
        "原住民族部落名錄中的部落",
      ),
      value: data.villages.count > 0 ? grouped(data.villages.count) : null,
      gap: t("None in the list for this county", "名錄中此縣市沒有部落"),
      place: placeText(data.villages.place, language, {
        en: "with villages",
        zh: "有部落的縣市",
      }),
      what: t(
        "Reference points from the Council of Indigenous Peoples’ village catalogue.",
        "取自原住民族委員會部落名錄的參考點。",
      ),
      cannot: t(
        "A point is not a territory and says nothing about land rights; a listing date is not a founding date.",
        "一個點不是傳統領域，也不代表土地權利；列名日期不是建立日期。",
      ),
      source: t(
        "Council of Indigenous Peoples, village catalogue (Open Government Data License 1.0)",
        "原住民族委員會部落名錄（政府資料開放授權條款第 1 版）",
      ),
    },
    {
      id: "taipei",
      tone: "urban",
      subject: t("Trees", "樹木"),
      heading: t(
        "Park and riverside tree records, Taipei",
        "臺北公園與河濱樹木紀錄",
      ),
      value: data.taipei ? grouped(data.taipei.trees) : null,
      gap: t(
        "Taipei City only; no inventory here",
        "僅臺北市有；此縣市沒有清查資料",
      ),
      place: data.taipei
        ? t(
            `${grouped(data.taipei.kinds)} kinds in ${grouped(data.taipei.parks)} parks`,
            `${grouped(data.taipei.parks)} 座公園，${grouped(data.taipei.kinds)} 種樹`,
          )
        : null,
      what: t(
        "Trees recorded in the Taipei park and riverside inventories.",
        "臺北市公園與河濱樹木清查所記錄的樹。",
      ),
      cannot: t(
        "A record says a tree was surveyed, not that it still stands; Taipei only, and not street trees.",
        "紀錄只說明樹曾被調查，不代表現在仍在；僅限臺北，且不含行道樹。",
      ),
      source: t(
        "Taipei City open data, park and riverside tree inventories",
        "臺北市政府公園與河濱樹木清查開放資料",
      ),
    },
  ];
}

// ------------------------------------------------------------ the picture --

/** The lines of the share image: four findings, each as a label in both
 *  languages and a figure, with a dash where there is none. */
export interface ShareLine {
  zh: string;
  en: string;
  value: string;
  tone: CardTone;
}
export function shareLines(data: CountyCardData): ShareLine[] {
  const dash = "—";
  return [
    {
      zh: "PM2.5 年平均",
      en: `PM2.5, ${data.air.year}`,
      value: data.air.value === null ? dash : `${data.air.value} µg/m³`,
      tone: "environment",
    },
    {
      zh: "氣溫變化",
      en: `Warming vs ${baselinePeriod.from}–${String(baselinePeriod.to).slice(2)}`,
      value:
        data.warm.change === null
          ? dash
          : `${degrees(data.warm.change, true)} °C`,
      tone: "environment",
    },
    {
      zh: "森林比例",
      en: `Forest share, ${data.forest.year}`,
      value: data.forest.sharePct === null ? dash : `${data.forest.sharePct}%`,
      tone: "forests",
    },
    {
      zh: "路死通報",
      en: `Roadkill reports, ${data.roadkill.first}–${String(data.roadkill.last).slice(2)}`,
      value: data.roadkill.count === null ? dash : grouped(data.roadkill.count),
      tone: "wildlife",
    },
  ];
}

/** The sentence a link preview shows beneath the title: only figures the
 *  atlas has, in the order of the share image. */
export function shareDescription(data: CountyCardData): string {
  const have = shareLines(data).filter((line) => line.value !== "—");
  const figures = have.map((line) => `${line.en}: ${line.value}`).join(" · ");
  return figures
    ? `${figures}. Each with its source and what it cannot tell you. ${data.zh}的環境數字與限制。`
    : `What the atlas holds for ${data.en}, with sources and limits. ${data.zh}的環境數字與限制。`;
}
