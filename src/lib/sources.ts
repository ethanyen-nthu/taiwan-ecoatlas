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
    id: "reservoirs",
    name: { en: "Reservoir storage", zh: "水庫蓄水" },
    agency: { en: "Water Resources Agency", zh: "經濟部水利署" },
    url: "https://data.gov.tw/dataset/45501",
    datasetId: "45501 水庫水情資料 / 41568 水庫每日營運狀況",
    licence: "Open Government Data License 1.0",
    licenceUrl: openLicence,
    verifiedLicence: true,
    frequency: {
      en: "Hourly (automatic) or daily (read by hand), by reservoir",
      zh: "每小時（自動）或每日（人工），依水庫而定",
    },
    cacheSeconds: 1800,
    coverage: {
      en: "Latest day of readings; no history",
      zh: "最近一天的讀數；無歷史資料",
    },
    stage: "ready",
    note: {
      en: "Storage and water level come from the hourly water-situation feed; names and effective capacity from the daily operations list. The percentage full is computed here (storage ÷ effective capacity) and never capped, so a reservoir can exceed 100%. Gaps stay empty. The agency asks that storage percentages not be coloured green, yellow, orange or red, so they are drawn in one colour.",
      zh: "蓄水量與水位來自每小時水情資料；名稱與有效容量來自每日營運狀況。蓄水比例由本平台計算（蓄水量 ÷ 有效容量），不設上限，因此可能超過 100%。缺漏保持空白。水利署請勿將蓄水比例塗成綠、黃、橙、紅，因此只用單一顏色。",
    },
  },
  {
    id: "temperature",
    name: {
      en: "Temperature history (modelled)",
      zh: "氣溫歷史（模型資料）",
    },
    agency: {
      en: "Open-Meteo.com, serving ERA5-Land from Copernicus / ECMWF",
      zh: "Open-Meteo.com，提供哥白尼／ECMWF 的 ERA5-Land",
    },
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    datasetId: "ERA5-Land via archive-api.open-meteo.com/v1/archive",
    licence: "CC BY 4.0 (free for non-commercial use, credit required)",
    licenceUrl: "https://open-meteo.com/en/licence",
    verifiedLicence: true,
    frequency: {
      en: "Fetched once by script; not called while browsing",
      zh: "以腳本一次取得；瀏覽時不會連線",
    },
    cacheSeconds: null,
    coverage: {
      en: "1950 to 2025, the main town of each county; no values for Penghu or Lienchiang",
      zh: "1950 至 2025 年，各縣市主要城鎮；澎湖、連江沒有數值",
    },
    stage: "ready",
    note: {
      en: "A reanalysis on a grid about 10 km wide, so a model estimate and not a thermometer record. Daily means are reduced to yearly, summer (Jun–Aug) and winter (Dec–Feb) means, and a year is used only if at least 360 days have a value. Counties are averaged with equal weight, not by area. Places the model returns nothing for stay empty.",
      zh: "寬約 10 公里網格的再分析資料，是模型估計而非溫度計紀錄。日平均整理為年、夏季（6–8 月）與冬季（12–2 月）平均，一年至少有 360 天有值才採用。縣市以相同權重平均，不依面積加權；模型沒有回傳的地方保持空白。",
    },
  },
  {
    id: "river",
    name: { en: "River water quality", zh: "河川水質" },
    agency: { en: "Ministry of Environment", zh: "環境部" },
    url: "https://data.moenv.gov.tw/en/dataset/detail/WQX_P_01",
    datasetId: "WQX_P_01",
    licence: "Open Government Data License 1.0",
    licenceUrl: openLicence,
    verifiedLicence: true,
    frequency: {
      en: "Monthly field sampling, with publication lag",
      zh: "每月實地採樣，延後發布",
    },
    cacheSeconds: 21600,
    coverage: {
      en: "Sampling dates, not live conditions",
      zh: "以採樣日期呈現，非即時水質",
    },
    stage: "ready",
    note: {
      en: "Server-side API adapter. A bounded extract of up to 10,000 indicator rows is queried, not the complete archive. Sampling dates remain separate from retrieval; publication dates are not inferred. Censored or missing measurements remain empty.",
      zh: "由伺服器介接，最多查詢 10,000 筆指標資料，非完整典藏。採樣日期與擷取時間分開，不推測發布日期；低於偵測限或缺少之測值保留缺值。",
    },
  },
  {
    id: "landcover",
    name: { en: "Historical land cover", zh: "歷史土地覆蓋" },
    agency: { en: "Research dataset on Zenodo", zh: "Zenodo 研究資料集" },
    url: "https://zenodo.org/records/14033363",
    datasetId: "14033363",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    verifiedLicence: true,
    frequency: { en: "Verified research releases", zh: "經驗證的研究版本" },
    cacheSeconds: null,
    coverage: {
      en: "2023 classification and 19 mapped county summaries; offshore gaps",
      zh: "2023 分類與 19 個已涵蓋縣市摘要；離島有缺口",
    },
    stage: "ready",
    note: {
      en: "The verified 2023 research raster, rendered overview and original-pixel county statistics are imported. Class 5 remains unresolved. The archive contains 2015- and 2023-labelled files, not a verified 2013 baseline; no 2013 change claim is made. This is not a legal forest inventory.",
      zh: "已匯入驗證之 2023 研究柵格、概覽影像及原始像元縣市統計；類別 5 尚未區分。壓縮檔為標示 2015、2023 的檔案，並無已驗證之 2013 基準，不發布 2013 變遷結論。並非法定森林清查。",
    },
  },
  {
    id: "roadkill",
    name: { en: "Taiwan Roadkill Observation Network", zh: "臺灣路死觀察網" },
    agency: { en: "TaiBIF / GBIF", zh: "TaiBIF／GBIF" },
    url: "https://www.gbif.org/dataset/db09684b-0fd1-431e-b5fa-4c1532fbdb14",
    datasetId: "db09684b-0fd1-431e-b5fa-4c1532fbdb14",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    verifiedLicence: true,
    frequency: { en: "Published archive versions", zh: "依發布的典藏版本" },
    cacheSeconds: null,
    coverage: {
      en: "Limited 2014–2017 public subset of the 2011–2017 historical archive",
      zh: "2011–2017 歷史典藏之有限 2014–2017 公開子集",
    },
    stage: "ready",
    note: {
      en: "GBIF Least Concern records screened against published terrestrial and marine lists; uncertain sensitive groups and taxonomic mismatches are omitted. Published points are generalized 10 km grid-cell centres; exact coordinates, observer information and individual source links are withheld. Counts reflect reporting effort, not wildlife abundance or a direct risk estimate. The full archive is not published here.",
      zh: "GBIF 無危紀錄經公開陸域與海洋名錄篩選；不確定的敏感分類群與分類對照不一致者予以排除。公開點位為概化之 10 公里網格中心；不公開精確座標、觀察者及個別來源連結。筆數受通報投入影響，不代表動物數量或直接風險估計；此處並未公開完整典藏。",
    },
  },
  {
    id: "villages",
    name: { en: "Indigenous village geography", zh: "原住民族部落地理" },
    agency: { en: "Council of Indigenous Peoples", zh: "原住民族委員會" },
    url: "https://data.gov.tw/dataset/156632",
    datasetId: "A53000000A-111027-001",
    licence: "Open Government Data License 1.0",
    licenceUrl: openLicence,
    verifiedLicence: true,
    frequency: { en: "Versioned public release", zh: "依公開版本" },
    cacheSeconds: null,
    coverage: {
      en: "730 validated public village reference points; nine source records excluded",
      zh: "730 筆通過驗證之公開部落定位點；排除九筆來源資料",
    },
    stage: "ready",
    note: {
      en: "Source-listed traditional names, groups and reference points are retained. Points do not define traditional territories or access rights. Listing dates are not founding dates. Separate cultural sources include public historical trail geometry and eight nonspatial historical study profiles.",
      zh: "保留來源傳統名制、族別與定位點；點位不代表傳統領域或進入權利，列載日期並非成立日期。另有公開古道幾何及八筆無空間座標之歷史研究簡介。",
    },
  },
  {
    id: "urban",
    name: {
      en: "Taipei public parks and trees",
      zh: "臺北市公園與公共樹木",
    },
    agency: {
      en: "Taipei City Government municipal inventories",
      zh: "臺北市政府地方清冊",
    },
    url: "https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8",
    datasetId:
      "7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8 / 128366 / 34800b67-b5a5-4ce9-9892-eb0945b82644",
    licence: "Open Government Data License 1.0",
    licenceUrl: openLicence,
    verifiedLicence: true,
    frequency: { en: "Source dependent", zh: "依來源而定" },
    cacheSeconds: null,
    coverage: {
      en: "Taipei only: parks, park trees and a one-time 2016–2017 riverside survey",
      zh: "僅臺北市：公園、公園樹木及 2016–2017 一次性河濱調查",
    },
    stage: "ready",
    note: {
      en: "812 park reference locations, 85,177 park-tree records and 10,735 historical riverside records. Inventory dates do not prove current survival or canopy change. No national tree coverage or imported satellite surface-temperature scene is claimed. CWA air temperature remains a separate measured layer.",
      zh: "812 處公園定位點、85,177 筆公園樹木及 10,735 筆歷史河濱紀錄。盤點日期不證明現況存活或樹冠變遷；不宣稱全國樹木覆蓋，尚未匯入衛星地表溫度影像。CWA 氣溫維持獨立實測圖層。",
    },
  },
];
export const sourceById = (id: string) =>
  sources.find((source) => source.id === id)!;
