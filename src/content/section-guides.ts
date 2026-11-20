import type { GuideText } from "@/components/section-guide";
import type { AtlasSection } from "@/lib/atlas-types";

/**
 * One short orientation per subject page: what is drawn, what a reader can
 * take from it, and what it cannot say. Wording stays within each dataset's
 * published limitation.
 */
export const sectionGuides: Record<AtlasSection, GuideText> = {
  environment: {
    what: {
      en: "Live readings from Taiwan’s official air-quality and weather stations. Counties are tinted by the average of their stations; each dot is one station, coloured with the official air-quality scale.",
      zh: "臺灣官方空氣品質與氣象測站的即時讀數。縣市底色是轄內測站的平均，每個點是一個測站，並使用官方空品色階。",
    },
    learn: {
      en: [
        "How air quality differs between counties right now, and what each AQI band means.",
        "The difference between AQI, PM₂.₅ and PM₁₀.",
        "How temperature, humidity, rain and wind vary across mountains, plains and coast at the same moment.",
      ],
      zh: [
        "此刻各縣市空氣品質的差異，以及每個 AQI 等級的意義。",
        "AQI、PM₂.₅ 與 PM₁₀ 有什麼不同。",
        "同一時刻，山區、平原與海岸的氣溫、濕度、雨量與風有何差別。",
      ],
    },
    limits: {
      en: "Latest reports only, not a history or a forecast. A county average hides local differences, stations are not evenly spread, and a station reading is not a satellite surface temperature.",
      zh: "僅最新測站報告，不是歷史紀錄或預報。縣市平均會掩蓋地方差異，測站分布並不均勻，測站讀數也不等於衛星地表溫度。",
    },
  },
  forests: {
    what: {
      en: "Taiwan’s 2023 land cover from a research classification, summarised for each county: how much of the land is mapped as forest and what the other classes are.",
      zh: "以研究分類製作的 2023 年臺灣土地覆蓋，並依縣市彙整：多少土地被標為森林，其他類別又是什麼。",
    },
    learn: {
      en: [
        "Where the island’s forest is concentrated, and how counties compare in forest share.",
        "What each land-cover class means and how a map class differs from a legal forest.",
        "Why a map of one year cannot show change on its own.",
      ],
      zh: [
        "森林集中在哪些地方，各縣市的森林比例如何比較。",
        "每個土地覆蓋類別的意義，以及地圖分類與法定森林的差別。",
        "為什麼只有單一年份的地圖無法顯示變化。",
      ],
    },
    limits: {
      en: "This is a 2023 research classification, not a legal forest inventory. There is no 2013 comparison because the source file is not available, and a change of class alone would not prove deforestation.",
      zh: "這是 2023 年的研究分類，不是法定森林清查。因為來源檔案無法取得，所以沒有 2013 年的比較；單憑類別改變也不能證明森林遭砍伐。",
    },
  },
  wildlife: {
    what: {
      en: "Animals recorded dead on Taiwan’s roads from 2014 to 2017, drawn from a public subset of the national roadkill archive. Each county is shaded by how many records it holds, with the number printed inside; 99 species are named.",
      zh: "2014 至 2017 年臺灣道路上被記錄的動物路死紀錄，取自全國路死資料的公開子集。各縣市依紀錄數著色，數字標在縣市內，共收錄 99 種動物。",
    },
    learn: {
      en: [
        "Which animals are recorded most often, and which group they belong to: amphibians, reptiles, birds, mammals or crustaceans.",
        "Where roads cut through animal habitat. Click any animal for its Chinese and English name, photos and records.",
        "Why a record of roadkill is evidence of an animal meeting a road, not a headcount.",
      ],
      zh: [
        "哪些動物最常被記錄，屬於兩棲、爬蟲、鳥類、哺乳或甲殼類中的哪一類。",
        "道路在哪裡切過動物棲地。點選任何一種動物，可看中英文名稱、照片與紀錄。",
        "為什麼路死紀錄代表動物與道路相遇，而不是族群數量。",
      ],
    },
    limits: {
      en: "Positions are generalised to 10 km grid squares, rare and protected species are screened out, and the archive stops in 2017. Where people looked affects what was found.",
      zh: "位置已概化為 10 公里方格，稀有與保育物種已先行篩除，資料止於 2017 年；調查者去過哪裡也會影響找到什麼。",
    },
  },
  culture: {
    what: {
      en: "Public reference points for Indigenous villages, historical studies and trail routes from the Council of Indigenous Peoples, and guides to the sixteen officially recognised peoples.",
      zh: "原住民族部落的公開定位點、原住民族委員會的歷史研究與古道路線，以及十六個官方認定族群的導覽。",
    },
    learn: {
      en: [
        "Where the catalogued villages are, and how each source names them and their peoples.",
        "Who the sixteen peoples are, with a page for each.",
        "How historical trails connected places, and what studies exist about them.",
      ],
      zh: [
        "名錄中的部落在哪裡，來源如何稱呼它們與其族群。",
        "十六個族群是誰，每個族群各有一頁。",
        "歷史古道如何連結各地，以及有哪些相關研究。",
      ],
    },
    limits: {
      en: "A point locates a published village, not a traditional territory or any right of access. The trails are a selection, closures and community restrictions take precedence, and eight studies have no coordinates so they are not drawn.",
      zh: "定位點只標示已公布的部落位置，不代表傳統領域或進入權利。古道僅是精選，封閉與部落限制優先；八份研究沒有座標，因此不繪製。",
    },
  },
  urban: {
    what: {
      en: "Parks, park trees and riverside trees in Taipei, next to measured air temperature from weather stations across the island.",
      zh: "臺北的公園、公園樹木與河濱樹木，並列島內各測站的實測氣溫。",
    },
    learn: {
      en: [
        "Where Taipei’s parks are, and which kinds of tree grow in them (see the Plants page for a guide to each).",
        "How large trees get, from trunk width and height.",
        "How warm different parts of the island run on the same day.",
      ],
      zh: [
        "臺北的公園在哪裡、裡面種了哪些樹（每種樹在「植物」頁有專頁介紹）。",
        "從胸徑與樹高看樹長到多大。",
        "同一天島內各地的氣溫差多少。",
      ],
    },
    limits: {
      en: "Parks and trees cover Taipei only, see below. A tree inventory says a tree was surveyed, not that it is alive today or how much shade it gives.",
      zh: "公園與樹木只涵蓋臺北，原因見下方說明。樹木清冊代表樹曾被調查，不代表現在仍存活，也無法說明遮蔭多寡。",
    },
  },
};

export const cityPortals: { name: { en: string; zh: string }; url: string }[] =
  [
    {
      name: { en: "New Taipei City", zh: "新北市" },
      url: "https://data.ntpc.gov.tw",
    },
    {
      name: { en: "Taoyuan City", zh: "桃園市" },
      url: "https://data.tycg.gov.tw",
    },
    {
      name: { en: "Taichung City", zh: "臺中市" },
      url: "https://opendata.taichung.gov.tw",
    },
    {
      name: { en: "Tainan City", zh: "臺南市" },
      url: "https://data.tainan.gov.tw",
    },
    {
      name: { en: "Kaohsiung City", zh: "高雄市" },
      url: "https://data.kcg.gov.tw",
    },
    {
      name: { en: "Taiwan national portal", zh: "政府資料開放平臺" },
      url: "https://data.gov.tw",
    },
  ];
