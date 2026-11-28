import type { Localized } from "./types";
import { aqiColours, aqiStatusEnglish } from "./transform";
export type LayerId =
  | "counties"
  | "aqi"
  | "weather"
  | "earthquakes"
  | "typhoon"
  | "river"
  | "forest"
  | "forest-change"
  | "roadkill"
  | "villages"
  | "green"
  | "trees"
  | "surface-temperature";
export interface MapLayer {
  id: LayerId;
  name: Localized;
  description: Localized;
  source: string;
  available: boolean;
  visible: boolean;
  color: string;
  temporal: boolean;
  dateRange: string | null;
  legend: { label: Localized; color: string }[];
}
const definitions: Omit<MapLayer, "legend">[] = [
  {
    id: "counties",
    name: { en: "County boundaries", zh: "縣市界線" },
    description: {
      en: "22 official administrative units",
      zh: "22 個官方行政區",
    },
    source: "counties",
    available: true,
    visible: true,
    color: "#505963",
    temporal: false,
    dateRange: "2025-03-18",
  },
  {
    id: "aqi",
    name: { en: "Air quality", zh: "空氣品質" },
    description: { en: "AQI & pollutant measurements", zh: "AQI 與污染物測量" },
    source: "aqi",
    available: true,
    visible: true,
    color: "#1a7cb0",
    temporal: true,
    dateRange: null,
  },
  {
    id: "weather",
    name: { en: "Weather stations", zh: "氣象測站" },
    description: {
      en: "Measured temperature & rainfall",
      zh: "實測氣溫與雨量",
    },
    source: "weather",
    available: true,
    visible: false,
    color: "#0a8685",
    temporal: true,
    dateRange: null,
  },
  {
    id: "earthquakes",
    name: { en: "Felt earthquakes", zh: "有感地震" },
    description: {
      en: "Recent reports, sized by magnitude, coloured by strongest shaking",
      zh: "近期報告，大小為規模，顏色為最大震度",
    },
    source: "earthquakes",
    available: true,
    visible: false,
    color: "#b02a2e",
    temporal: true,
    dateRange: null,
  },
  {
    id: "typhoon",
    name: { en: "Tropical cyclone track", zh: "熱帶氣旋路徑" },
    description: {
      en: "Analysed and forecast positions with wind radii",
      zh: "分析與預測位置及風圈半徑",
    },
    source: "typhoon",
    available: true,
    visible: false,
    color: "#4a3aa7",
    temporal: true,
    dateRange: null,
  },
  {
    id: "river",
    name: { en: "River water quality", zh: "河川水質" },
    description: { en: "Sample-based water chemistry", zh: "實體採樣水質分析" },
    source: "river",
    available: false,
    visible: false,
    color: "#1a7cb0",
    temporal: true,
    dateRange: null,
  },
  {
    id: "forest",
    name: { en: "Forest cover", zh: "森林覆蓋" },
    description: { en: "County-level land cover", zh: "縣市土地覆蓋" },
    source: "landcover",
    available: false,
    visible: false,
    color: "#4b853e",
    temporal: true,
    dateRange: "2013 / 2023",
  },
  {
    id: "forest-change",
    name: { en: "Forest change", zh: "森林變遷" },
    description: {
      en: "Historical land-cover comparison",
      zh: "歷史土地覆蓋比較",
    },
    source: "landcover",
    available: false,
    visible: false,
    color: "#4b853e",
    temporal: true,
    dateRange: "2013–2023",
  },
  {
    id: "roadkill",
    name: { en: "Wildlife observations", zh: "野生動物觀察" },
    description: { en: "Historical roadkill archive", zh: "歷史路死觀察典藏" },
    source: "roadkill",
    available: false,
    visible: false,
    color: "#a06a08",
    temporal: true,
    dateRange: "2011–2017",
  },
  {
    id: "villages",
    name: { en: "Indigenous villages", zh: "原住民族部落" },
    description: {
      en: "Publicly documented village points",
      zh: "公開紀錄之部落點位",
    },
    source: "villages",
    available: false,
    visible: false,
    color: "#ae5843",
    temporal: false,
    dateRange: null,
  },
  {
    id: "green",
    name: { en: "Urban green spaces", zh: "都市綠地" },
    description: {
      en: "Verified public park boundaries",
      zh: "經確認的公園範圍",
    },
    source: "urban",
    available: false,
    visible: false,
    color: "#0a8685",
    temporal: false,
    dateRange: null,
  },
  {
    id: "trees",
    name: { en: "Public trees", zh: "公共樹木" },
    description: { en: "Municipal tree inventories", zh: "地方政府樹木清冊" },
    source: "urban",
    available: false,
    visible: false,
    color: "#0a8685",
    temporal: false,
    dateRange: null,
  },
  {
    id: "surface-temperature",
    name: { en: "Surface temperature", zh: "地表溫度" },
    description: { en: "Historical satellite measurement", zh: "歷史衛星測量" },
    source: "urban",
    available: false,
    visible: false,
    color: "#0a8685",
    temporal: true,
    dateRange: null,
  },
];
export const layers: MapLayer[] = definitions.map((layer) => ({
  ...layer,
  legend:
    layer.id === "aqi"
      ? [
          ...Object.entries(aqiColours).map(([zh, color]) => ({
            label: { en: aqiStatusEnglish[zh], zh },
            color,
          })),
          {
            label: { en: "Status unavailable", zh: "狀態無資料" },
            color: "#7c868d",
          },
        ]
      : layer.available
        ? [{ label: layer.name, color: layer.color }]
        : [],
}));
