import { sectionTabs, type SectionKey } from "@/content/section-tabs";
import type { SearchRow } from "./search";

const sectionNames: Record<SectionKey, [string, string]> = {
  environment: ["Environment", "環境"],
  forests: ["Forests", "森林"],
  wildlife: ["Wildlife", "野生動物"],
  culture: ["Culture", "文化"],
  urban: ["City", "城市"],
  plants: ["Plants", "植物"],
};

/** Words people are likely to type that the page's title does not contain. */
const keywords: Record<string, string> = {
  "/environment":
    "air pollution PM2.5 AQI weather stations live 空污 空氣 測站",
  "/environment/air-over-time": "air pollution PM2.5 smog 空污 懸浮微粒",
  "/environment/weather":
    "rain rainfall wind humidity heat temperature now 雨量 風 濕度 氣溫",
  "/environment/temperature-over-time":
    "warming climate change heat history hotter 暖化 氣候變遷 氣溫 歷史 變熱",
  "/environment/reservoirs":
    "dam water supply drought storage 水庫 缺水 蓄水 乾旱 水情",
  "/environment/rivers-over-time": "river water pollution clean 河川 水質 污染",
  "/forests": "land cover trees 森林 土地覆蓋",
  "/forests/over-time": "deforestation inventory 森林 資源調查",
  "/wildlife": "roadkill animals map 路死 路殺 動物",
  "/wildlife/year-by-year": "roadkill trend 路死 逐年",
  "/culture": "Indigenous villages trails 原住民 部落 古道",
  "/culture/peoples": "Indigenous Aboriginal tribes 原住民族 族群",
  "/culture/population": "Indigenous population registered 人口",
  "/urban": "Taipei parks trees 公園 樹木 臺北",
  "/urban/over-time": "parks history decade 公園 年代",
  "/plants": "trees species guide 樹 樹木 植物 種類",
  "/plants/surveys": "tree survey 樹木 調查",
};

const extras: SearchRow[] = [
  ["page", "Overview", "總覽", "/", "home start 首頁 開始"],
  [
    "page",
    "Explore map",
    "探索地圖",
    "/explore",
    "atlas layers counties 圖層 縣市 地圖",
  ],
  [
    "page",
    "Teach",
    "教學",
    "/teach",
    "lessons classroom professor course 課程 教案 老師",
  ],
  [
    "page",
    "Glossary",
    "名詞解釋",
    "/teach/glossary",
    "terms definitions words 詞彙 定義",
  ],
  [
    "page",
    "Compare counties",
    "縣市比較",
    "/county",
    "county profiles side by side 縣市 並排",
  ],
  [
    "page",
    "Data downloads",
    "資料下載",
    "/data",
    "download JSON CSV API files 下載 資料",
  ],
  [
    "page",
    "Data sources",
    "資料來源",
    "/sources",
    "licences licenses limits provenance 授權 限制 來源",
  ],
  [
    "page",
    "About and methods",
    "關於與方法",
    "/about",
    "methodology maker credit 方法 製作",
  ],
  [
    "page",
    "Suggest or report a bug",
    "建議或回報問題",
    "/feedback",
    "feedback email contact mistake error wrong 回饋 信箱 聯絡 錯誤",
  ],
];

/** Every page a person can open from the menus, with its section named. */
export function pageRows(): SearchRow[] {
  const rows: SearchRow[] = [];
  for (const key of Object.keys(sectionTabs) as SectionKey[]) {
    const [en, zh] = sectionNames[key];
    sectionTabs[key].forEach((tab, index) => {
      const extra = [
        tab.hint.en,
        tab.hint.zh,
        keywords[tab.href] ?? "",
        index === 0 ? "" : `${en} ${zh}`,
      ].join(" ");
      if (index === 0) {
        // The first tab is the subject itself; name it by the subject.
        rows.push([
          "page",
          en,
          zh,
          tab.href,
          `${tab.label.en} ${tab.label.zh} ${extra}`,
          [tab.hint.en, tab.hint.zh],
        ]);
      } else {
        rows.push([
          "page",
          tab.label.en,
          tab.label.zh,
          tab.href,
          extra,
          [`${en} · ${tab.hint.en}`, `${zh}・${tab.hint.zh}`],
        ]);
      }
    });
  }
  return [...rows, ...extras];
}
