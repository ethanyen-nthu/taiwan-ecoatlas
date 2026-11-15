import type { Localized } from "./types";
export interface Source {
  id: string;
  name: Localized;
  agency: Localized;
  url: string;
  datasetId: string;
  licence: string;
  licenceUrl: string | null;
  verifiedLicence: boolean;
  frequency: Localized;
  cacheSeconds: number | null;
  coverage: Localized;
  stage: "ready" | "planned";
  note: Localized;
}
const openLicence = "https://data.gov.tw/license";
export const sources: Source[] = [
  {
    id: "counties",
    name: { en: "County & city boundaries", zh: "直轄市、縣市界線" },
    agency: {
      en: "National Land Surveying and Mapping Center",
      zh: "內政部國土測繪中心",
    },
    url: "https://data.gov.tw/en/datasets/7442",
    datasetId: "7442 / COUNTY_MOI_1140318",
    licence: "Open Government Data License 1.0",
    licenceUrl: openLicence,
    verifiedLicence: true,
    frequency: { en: "Irregular", zh: "不定期" },
    cacheSeconds: null,
    coverage: {
      en: "Official 2025-03-18 boundary edition",
      zh: "官方 2025-03-18 界線版本",
    },
    stage: "ready",
    note: {
      en: "All 22 units. Original vertices retained; WGS84 conversion, 7 decimal places. Not a legal boundary determination.",
      zh: "涵蓋 22 縣市，保留原始節點；轉為 WGS84，取小數 7 位。不作法定界址認定。",
    },
  },
  {
    id: "aqi",
    name: { en: "Air quality observations", zh: "空氣品質觀測" },
    agency: { en: "Ministry of Environment", zh: "環境部" },
    url: "https://data.moenv.gov.tw/en/dataset/detail/AQX_P_432",
    datasetId: "AQX_P_432",
    licence: "Open Government Data License 1.0",
    licenceUrl: openLicence,
    verifiedLicence: true,
    frequency: { en: "Hourly", zh: "每小時" },
    cacheSeconds: 1800,
    coverage: {
      en: "Latest reported station observations",
      zh: "測站最新發布觀測",
    },
    stage: "ready",
    note: {
      en: "Official reported AQI status determines colour. Missing pollutant measurements remain empty.",
      zh: "依官方發布的 AQI 狀態標色；缺少的污染物測值維持空值。",
    },
  },
  {
    id: "weather",
    name: { en: "Weather station observations", zh: "氣象測站觀測" },
    agency: { en: "Central Weather Administration", zh: "中央氣象署" },
    url: "https://opendata.cwa.gov.tw/devManual/description",
    datasetId: "O-A0003-001 / O-A0001-001",
    licence: "Open Government Data License 1.0",
    licenceUrl: "https://opendata.cwa.gov.tw/about/rules",
    verifiedLicence: true,
    frequency: {
      en: "10-minute / hourly, by dataset",
      zh: "每 10 分鐘／每小時，依資料集",
    },
    cacheSeconds: 600,
    coverage: {
      en: "Latest observations; both station networks",
      zh: "兩類測站網的最新觀測",
    },
    stage: "ready",
    note: {
      en: "Measured air temperature at stations, without spatial interpolation. Rainfall is daily accumulated precipitation.",
      zh: "呈現測站實測氣溫，不進行空間內插；雨量為當日累積降水量。",
    },
  },
  {
    id: "river",
    name: { en: "River water quality", zh: "河川水質" },
    agency: { en: "Ministry of Environment", zh: "環境部" },
    url: "https://data.moenv.gov.tw/en/dataset/detail/WQX_P_01",
    datasetId: "WQX_P_01",
    licence: "Pending metadata verification",
    licenceUrl: openLicence,
    verifiedLicence: false,
    frequency: {
      en: "Physical sampling; verify release schedule",
      zh: "實體採樣；待確認發布頻率",
    },
    cacheSeconds: 604800,
    coverage: {
      en: "Sampling dates, not live conditions",
      zh: "以採樣日期呈現，非即時水質",
    },
    stage: "planned",
    note: {
      en: "Milestone 2. Sampling and publication dates must remain distinct.",
      zh: "第二階段；採樣日期與發布日期分開呈現。",
    },
  },
  {
    id: "landcover",
    name: { en: "Historical land cover", zh: "歷史土地覆蓋" },
    agency: { en: "Research dataset on Zenodo", zh: "Zenodo 研究資料集" },
    url: "https://zenodo.org/records/14033363",
    datasetId: "14033363",
    licence: "Pending metadata verification",
    licenceUrl: null,
    verifiedLicence: false,
    frequency: { en: "Verified research releases", zh: "經驗證的研究版本" },
    cacheSeconds: null,
    coverage: {
      en: "2013 and 2023; import pending",
      zh: "2013 與 2023；尚未匯入",
    },
    stage: "planned",
    note: {
      en: "Milestone 3. Class codes, CRS and licence must be inspected before use; no forest statistics calculated yet.",
      zh: "第三階段；使用前須確認分類代碼、座標系及授權；尚未計算森林統計。",
    },
  },
  {
    id: "roadkill",
    name: { en: "Taiwan Roadkill Observation Network", zh: "臺灣路死觀察網" },
    agency: { en: "TaiBIF / GBIF", zh: "TaiBIF／GBIF" },
    url: "https://www.gbif.org/dataset/db09684b-0fd1-431e-b5fa-4c1532fbdb14",
    datasetId: "db09684b-0fd1-431e-b5fa-4c1532fbdb14",
    licence: "CC BY 4.0 — verification before import",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    verifiedLicence: false,
    frequency: { en: "Published archive versions", zh: "依發布的典藏版本" },
    cacheSeconds: null,
    coverage: {
      en: "2011–December 2017; historical archive",
      zh: "2011–2017 年 12 月；歷史典藏",
    },
    stage: "planned",
    note: {
      en: "Milestone 3. Reporting density is affected by sampling bias and is not a direct risk estimate.",
      zh: "第三階段；通報密度受採樣偏差影響，不能直接推論路死風險。",
    },
  },
  {
    id: "villages",
    name: { en: "Indigenous village geography", zh: "原住民族部落地理" },
    agency: { en: "Council of Indigenous Peoples", zh: "原住民族委員會" },
    url: "https://data.gov.tw/dataset/156632",
    datasetId: "A53000000A-111027-001",
    licence: "Open Government Data License — verification before import",
    licenceUrl: openLicence,
    verifiedLicence: false,
    frequency: { en: "Annual, verify before import", zh: "每年；匯入前確認" },
    cacheSeconds: 2592000,
    coverage: {
      en: "Public village points; import pending",
      zh: "公開部落點位；尚未匯入",
    },
    stage: "planned",
    note: {
      en: "Milestone 4. Village points do not define traditional territories.",
      zh: "第四階段；部落點位不代表傳統領域範圍。",
    },
  },
  {
    id: "urban",
    name: {
      en: "Parks, trees & surface temperature",
      zh: "公園、樹木與地表溫度",
    },
    agency: {
      en: "Municipal sources to be selected",
      zh: "待確認各地方政府來源",
    },
    url: "https://data.gov.tw/",
    datasetId: "Not yet selected",
    licence: "Not verified; import disabled",
    licenceUrl: null,
    verifiedLicence: false,
    frequency: { en: "Source dependent", zh: "依來源而定" },
    cacheSeconds: null,
    coverage: {
      en: "No nationwide inventory claimed",
      zh: "不宣稱全國盤點完整",
    },
    stage: "planned",
    note: {
      en: "Milestone 4. Air temperature and satellite land-surface temperature are different measurements.",
      zh: "第四階段；氣溫與衛星地表溫度為不同測量。",
    },
  },
];
export const sourceById = (id: string) =>
  sources.find((source) => source.id === id)!;
