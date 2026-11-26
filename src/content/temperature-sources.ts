import type { HistorySource } from "./history-types";

/** What the "Temperature over time" page was built from. The numbers are
 *  fetched once by scripts/build-temperature-history.mjs and kept in
 *  src/data/temperature-history.json. */
export const temperatureSources: HistorySource[] = [
  {
    id: "open-meteo-archive",
    title: {
      en: "Historical Weather API: daily mean temperature, ERA5-Land",
      zh: "歷史天氣 API：每日平均氣溫（ERA5-Land）",
    },
    publisher: "Open-Meteo.com",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    used: {
      en: "Daily mean air temperature at 2 m for 1950 to 2025 at the main town of each county, fetched once in November 2026 and reduced to yearly, summer and winter means.",
      zh: "1950 至 2025 年各縣市主要城鎮的 2 公尺高度日平均氣溫，2026 年 11 月一次取得，再整理成年、夏季與冬季平均。",
    },
  },
  {
    id: "era5-land-paper",
    title: {
      en: "ERA5-Land: a state-of-the-art global reanalysis dataset for land applications",
      zh: "ERA5-Land：供陸地應用的先進全球再分析資料集",
    },
    publisher: "Muñoz-Sabater et al., Earth System Science Data 13 (2021)",
    url: "https://essd.copernicus.org/articles/13/4349/2021/",
    used: {
      en: "How the ERA5-Land dataset behind the numbers is produced, what it is meant for, and why it is a model rather than a set of thermometer readings.",
      zh: "說明這些數字背後的 ERA5-Land 資料如何產生、適合用在哪裡，以及它為何是模型而不是溫度計的讀數。",
    },
  },
  {
    id: "era5-land-cds",
    title: {
      en: "ERA5-Land hourly data, Climate Data Store",
      zh: "ERA5-Land 每小時資料（氣候資料商店）",
    },
    publisher: "Copernicus Climate Change Service (C3S), ECMWF",
    url: "https://doi.org/10.24381/cds.e2161bac",
    used: {
      en: "The reanalysis itself, which Open-Meteo serves. Credit: generated using Copernicus Climate Change Service information; the atlas averaged and rounded it.",
      zh: "Open-Meteo 所提供的再分析資料本身。出處：使用哥白尼氣候變遷服務（C3S）資訊產生；本平台再做平均與四捨五入。",
    },
  },
  {
    id: "open-meteo-licence",
    title: {
      en: "Open-Meteo licence and terms of use",
      zh: "Open-Meteo 授權與使用條款",
    },
    publisher: "Open-Meteo.com",
    url: "https://open-meteo.com/en/licence",
    used: {
      en: "The data are offered under CC BY 4.0; the free service is for non-commercial use and needs credit, which this page gives.",
      zh: "資料採 CC BY 4.0 授權；免費服務限非商業使用並須標示來源，本頁已依規定標示。",
    },
  },
];
