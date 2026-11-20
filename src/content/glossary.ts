import type { L } from "./lesson-index";

export interface Term {
  id: string;
  term: L;
  meaning: L;
  /** Lesson that uses the term. */
  lesson?: string;
}

/** Plain-language definitions for the words students meet in the atlas. */
export const glossary: Term[] = [
  {
    id: "aqi",
    term: { en: "AQI (Air Quality Index)", zh: "AQI（空氣品質指標）" },
    meaning: {
      en: "A single score built from pollutant readings so places and days can be compared. Higher is worse. The atlas uses the official six bands: 0–50, 51–100, 101–150, 151–200, 201–300 and 301 and above.",
      zh: "由污染物讀值換算出的單一分數，方便比較地點與日期，數字越高越差。本平台採官方六級：0–50、51–100、101–150、151–200、201–300、301 以上。",
    },
    lesson: "air-quality-index",
  },
  {
    id: "pm25",
    term: { en: "PM₂.₅", zh: "PM₂.₅（細懸浮微粒）" },
    meaning: {
      en: "Particles up to 2.5 micrometres across, measured as a concentration in micrograms per cubic metre of air (µg/m³). It is a measurement; AQI is a score.",
      zh: "粒徑 2.5 微米以下的懸浮微粒，以每立方公尺空氣中的微克數（µg/m³）表示濃度。它是量測值，AQI 則是分數。",
    },
    lesson: "air-quality-index",
  },
  {
    id: "station-mean",
    term: { en: "County mean of stations", zh: "縣市測站平均" },
    meaning: {
      en: "The average of the readings from the stations inside a county. It summarises stations, not people or area: it hides the spread between stations and gives a one-station county the same weight as a ten-station county.",
      zh: "縣市內各測站讀值的平均。它摘要的是測站，而非人口或面積：會掩蓋測站之間的差異，也讓只有一個測站的縣市與有十個測站的縣市看起來同等分量。",
    },
    lesson: "air-quality-index",
  },
  {
    id: "rpi",
    term: { en: "RPI (River Pollution Index)", zh: "RPI（河川污染指數）" },
    meaning: {
      en: "A score for river water built from four measurements (DO, BOD₅, SS and NH₃-N): each is converted to 1, 3, 6 or 10 points and the four are averaged. Lower is cleaner.",
      zh: "以四項測值（DO、BOD₅、SS、NH₃-N）計算的河川水質分數：各項換算成 1、3、6 或 10 分後取平均，分數越低越乾淨。",
    },
    lesson: "river-pollution-index",
  },
  {
    id: "do",
    term: { en: "DO (dissolved oxygen)", zh: "DO（溶氧量）" },
    meaning: {
      en: "The oxygen dissolved in water, in mg/L. Aquatic life depends on it, so for this measurement higher is better.",
      zh: "溶解於水中的氧氣量，單位 mg/L。水中生物仰賴它，因此這一項是數值越高越好。",
    },
    lesson: "river-pollution-index",
  },
  {
    id: "bod",
    term: {
      en: "BOD₅ (biochemical oxygen demand)",
      zh: "BOD₅（五日生化需氧量）",
    },
    meaning: {
      en: "The oxygen that microbes use up breaking down organic matter in a water sample over five days, in mg/L. More demand means more organic pollution.",
      zh: "水樣中的微生物在五天內分解有機物所消耗的氧氣量，單位 mg/L。需求越大，代表有機污染越多。",
    },
    lesson: "river-pollution-index",
  },
  {
    id: "ss",
    term: { en: "SS (suspended solids)", zh: "SS（懸浮固體）" },
    meaning: {
      en: "Solid particles carried in the water rather than dissolved in it, in mg/L.",
      zh: "懸浮在水中、未溶解的固體顆粒，單位 mg/L。",
    },
    lesson: "river-pollution-index",
  },
  {
    id: "nh3n",
    term: { en: "NH₃-N (ammonia nitrogen)", zh: "NH₃-N（氨氮）" },
    meaning: {
      en: "The nitrogen present as ammonia in water, in mg/L. It is commonly raised by sewage and some farm and industrial discharges.",
      zh: "水中以氨形式存在的氮，單位 mg/L。常因污水及部分農業與工業排放而升高。",
    },
    lesson: "river-pollution-index",
  },
  {
    id: "choropleth",
    term: { en: "Choropleth map", zh: "分級著色圖" },
    meaning: {
      en: "A map in which areas such as counties are shaded by a value. Counties differ in size and population, so a shaded area is a summary of the whole county, not of one place in it.",
      zh: "以縣市等區域依數值著色的地圖。縣市的面積與人口不同，著色代表整個縣市的摘要，而非其中某一處。",
    },
  },
  {
    id: "quantile",
    term: { en: "Quantile classes", zh: "分位數分級" },
    meaning: {
      en: "Classes chosen so each holds about the same number of areas. The atlas uses five. A small change in value can cross a class boundary, so read the number as well as the colour.",
      zh: "使每一級含有大致相同數量區域的分級方式。本平台使用五級。數值小幅變動可能跨越級距，因此請同時讀數字與顏色。",
    },
  },
  {
    id: "land-cover",
    term: { en: "Land cover", zh: "土地覆蓋" },
    meaning: {
      en: "What physically covers the ground, such as forest, buildings, water or crops, as classified from imagery. It is different from land use, which describes what people do with the land.",
      zh: "地表實際被什麼覆蓋，例如森林、建物、水體或作物，由影像分類而得。它不同於「土地利用」，後者描述人們如何使用土地。",
    },
    lesson: "where-is-the-forest",
  },
  {
    id: "raster",
    term: { en: "Raster and pixel", zh: "網格影像與像素" },
    meaning: {
      en: "A raster is a grid of small squares (pixels), each holding one class or value. County statistics count the original pixels; the map overview is simplified.",
      zh: "網格影像由許多小方格（像素）組成，每格記錄一個類別或數值。縣市統計計算原始像素；地圖概覽則經簡化。",
    },
    lesson: "where-is-the-forest",
  },
  {
    id: "forest-share",
    term: { en: "Forest share of mapped area", zh: "已繪製面積的森林占比" },
    meaning: {
      en: "Forest pixels divided by all mapped pixels in the county (every class, including unresolved ones). It is not a share of the county's legal area, and it says nothing about change.",
      zh: "森林像素除以縣市內所有已繪製像素（含未區分類別）。它不是縣市法定面積的占比，也不能說明變化。",
    },
    lesson: "where-is-the-forest",
  },
  {
    id: "baseline",
    term: { en: "Baseline", zh: "基準年" },
    meaning: {
      en: "An earlier reference point against which change is measured. The atlas has no verified 2013 land-cover baseline, so it shows no change over time.",
      zh: "用來衡量變化的較早參照點。本平台沒有經確認的 2013 土地覆蓋基準，因此不呈現時間上的變化。",
    },
    lesson: "where-is-the-forest",
  },
  {
    id: "record",
    term: { en: "Record versus animal", zh: "紀錄與動物" },
    meaning: {
      en: "A record is one report entered in a database. One record can describe one animal or several, and many animals are never reported at all. Counting records is not counting animals.",
      zh: "一筆紀錄是資料庫中的一則通報，可能描述一隻或數隻動物，而許多動物從未被通報。計算紀錄不等於計算動物。",
    },
    lesson: "roadkill-and-counting-effort",
  },
  {
    id: "effort",
    term: { en: "Counting (reporting) effort", zh: "調查（通報）投入" },
    meaning: {
      en: "How much looking and reporting went into producing the data: how many observers, how often, where, and with what tools. More effort produces more records even if nothing in nature changed.",
      zh: "產生資料所投入的觀察與通報量：多少觀察者、多常、在哪裡、用什麼工具。即使自然界沒有改變，投入增加也會產生更多紀錄。",
    },
    lesson: "roadkill-and-counting-effort",
  },
  {
    id: "generalised-location",
    term: {
      en: "Generalised location (10 km grid)",
      zh: "概化位置（10 公里網格）",
    },
    meaning: {
      en: "A point moved to the centre of a grid cell so exact places are not published. The dot shows which cell a record falls in, not where the animal was found.",
      zh: "把點位移到網格中心，不公開確切地點。這個點只表示紀錄落在哪一格，並非動物被發現的位置。",
    },
    lesson: "roadkill-and-counting-effort",
  },
  {
    id: "denominator",
    term: { en: "Denominator", zh: "分母" },
    meaning: {
      en: "The quantity you divide by to turn a count into a rate, such as kilometres of road, vehicles per day or animals present. Without one, a count cannot be compared between places.",
      zh: "把數量變成比率時所除的量，例如道路公里數、每日車流或現存動物數。沒有分母，數量就無法在不同地方之間比較。",
    },
    lesson: "roadkill-and-counting-effort",
  },
  {
    id: "reference-point",
    term: { en: "Public reference point (villages)", zh: "公開定位點（部落）" },
    meaning: {
      en: "A public place the source uses to locate a listed village, such as a police station. It indexes a record; it is not a boundary, a community centre or a claim to land.",
      zh: "來源用來定位所列部落的公開地點，例如派出所。它是紀錄的索引，並非邊界、社群中心，也不代表對土地的主張。",
    },
    lesson: "villages-and-places",
  },
  {
    id: "recognition",
    term: {
      en: "Official recognition of Indigenous peoples",
      zh: "原住民族的官方認定",
    },
    meaning: {
      en: "Taiwan's government officially recognises 16 Indigenous peoples. Other groups, including ten lowland (Pingpu) groups, are not recognised, so datasets built on official categories do not include them.",
      zh: "臺灣政府正式認定 16 個原住民族。其他群體，包括十個平埔族群，未獲認定，因此依官方分類建立的資料集不包含他們。",
    },
    lesson: "villages-and-places",
  },
  {
    id: "inventory",
    term: { en: "Inventory versus canopy", zh: "清冊與樹冠覆蓋" },
    meaning: {
      en: "A tree inventory lists surveyed trees with measurements on a survey date. Canopy cover measures how much ground the leaves shade. A list of trees is not a measure of shade, and survey records are not proof a tree is alive today.",
      zh: "樹木清冊列出調查日期當時的樹木及其測量值；樹冠覆蓋則衡量樹葉遮蔽多少地面。樹木清單不是遮蔭的量測，調查紀錄也不證明該樹目前存活。",
    },
    lesson: "urban-green-and-heat",
  },
  {
    id: "licence",
    term: {
      en: "Licence (for example CC BY 4.0)",
      zh: "授權（例如 CC BY 4.0）",
    },
    meaning: {
      en: "The terms under which data may be reused. CC BY 4.0 allows reuse, including in teaching, if you credit the source. Each dataset in the atlas names its own licence; always check it before republishing.",
      zh: "說明資料可如何再利用的條款。CC BY 4.0 允許再利用（含教學），但須標示來源。本平台每個資料集都標明自己的授權；重新發布前請務必確認。",
    },
    lesson: "audit-a-dataset",
  },
  {
    id: "provenance",
    term: { en: "Provenance", zh: "資料來歷" },
    meaning: {
      en: "The history of a dataset: who collected it, when, how it was processed and by whom. The atlas lists provenance with each dataset so a claim can be traced back to its source.",
      zh: "資料集的來歷：誰蒐集、何時、如何處理、由誰處理。本平台在每個資料集中列出來歷，讓每項主張都能追溯到來源。",
    },
    lesson: "audit-a-dataset",
  },
];
