import type { Language } from "@/lib/types";
import type { TodaySummary } from "@/lib/today";
import { countyByCode } from "@/lib/county-list";
import { aqiColorForValue } from "@/lib/transform";
import {
  ageWords,
  byStrength,
  countyName,
  cycloneClass,
  cycloneClassLabels,
  cycloneName,
  intensityBand,
  intensityColours,
  intensityText,
  latestFeltQuake,
  type HazardsResponse,
} from "@/lib/hazards";

export interface TodayFigure {
  key:
    | "air"
    | "temperature"
    | "rain"
    | "reservoirs"
    | "typhoon"
    | "quake"
    | "county-air"
    | "county-temperature";
  label: string;
  value: string;
  unit: string;
  detail: string;
  href: string;
  /** The official AQI band colour, drawn as a small dot beside the number;
   *  the band is always named in words too. */
  dot?: string;
  /** True when the feed's last good reading is older than it should be. */
  older: boolean;
  /** Marks a figure for the visitor's own pinned county. */
  pin?: boolean;
}

/** The pinned county's own air and temperature, from the middle of its
 *  stations. A part with no station reporting is left out, never zero. */
export function pinnedFigures(
  today: TodaySummary,
  code: string,
  language: Language,
): TodayFigure[] {
  const county = countyByCode(code);
  const found = today.counties?.[code];
  if (!county || !found) return [];
  const en = language === "en";
  const name = en ? county.en : county.zh;
  const figures: TodayFigure[] = [];
  if (found.air) {
    const band = en
      ? (found.air.bandEnglish ?? found.air.band)
      : found.air.band;
    figures.push({
      key: "county-air",
      label: en ? `${name} air (AQI)` : `${name}空氣（AQI）`,
      value: String(found.air.medianAqi),
      unit: band ?? "",
      detail: en
        ? `${band}, the middle of ${found.air.reporting} stations in ${name}`
        : `${band}，${name} ${found.air.reporting} 個測站的中間值`,
      href: `/county/${code}`,
      dot: aqiColorForValue(found.air.medianAqi),
      older: today.air.status === "stale",
      pin: true,
    });
  }
  if (found.weather) {
    const range =
      found.weather.coolest !== null &&
      found.weather.warmest !== null &&
      found.weather.stations > 1
        ? `${found.weather.coolest.toFixed(1)}–${found.weather.warmest.toFixed(1)} °C`
        : null;
    figures.push({
      key: "county-temperature",
      label: en ? `${name} temperature` : `${name}氣溫`,
      value: found.weather.medianTemperature.toFixed(1),
      unit: "°C",
      detail: en
        ? `Middle of ${found.weather.stations} stations in ${name}${range ? `, from ${range}` : ""}`
        : `${name} ${found.weather.stations} 個測站的中間值${range ? `，範圍 ${range}` : ""}`,
      href: `/county/${code}`,
      older: today.weather.status === "stale",
      pin: true,
    });
  }
  return figures;
}

/** The figures that have a reading. A part with no reading is left out, so
 *  nothing here is ever a made-up zero. Reservoir storage is one plain figure:
 *  the Water Resources Agency asks that it not be coloured like its water
 *  situation lights. */
export function todayFigures(
  today: TodaySummary,
  language: Language,
): TodayFigure[] {
  const en = language === "en";
  const figures: TodayFigure[] = [];

  const air = today.air;
  if (air.medianAqi !== null) {
    const band = en ? (air.bandEnglish ?? air.band) : air.band;
    figures.push({
      key: "air",
      label: en ? "Air quality (AQI)" : "空氣品質（AQI）",
      value: String(air.medianAqi),
      unit: band ?? "",
      detail: en
        ? `${band}, the middle of ${air.reporting} stations`
        : `${band}，${air.reporting} 個測站的中間值`,
      href: "/environment",
      dot: aqiColorForValue(air.medianAqi),
      older: air.status === "stale",
    });
  }

  const weather = today.weather;
  if (weather.medianTemperature !== null) {
    const range =
      weather.coolest && weather.warmest
        ? `${weather.coolest.value.toFixed(1)}–${weather.warmest.value.toFixed(1)} °C`
        : null;
    figures.push({
      key: "temperature",
      label: en ? "Temperature" : "氣溫",
      value: weather.medianTemperature.toFixed(1),
      unit: "°C",
      detail: en
        ? `Middle of ${weather.stations} stations${range ? `, from ${range}` : ""}`
        : `${weather.stations} 個測站的中間值${range ? `，範圍 ${range}` : ""}`,
      href: "/environment/weather",
      older: weather.status === "stale",
    });
  }
  if (weather.rainReporting > 0) {
    figures.push({
      key: "rain",
      label: en ? "Rain so far today" : "今天的降雨",
      value: String(weather.raining),
      unit: en
        ? `of ${weather.rainReporting} stations`
        : `／${weather.rainReporting} 個測站`,
      detail: en
        ? "Stations that have recorded some rain since midnight"
        : "從凌晨起記錄到降雨的測站",
      href: "/environment/weather",
      older: weather.status === "stale",
    });
  }

  const reservoirs = today.reservoirs;
  if (reservoirs.percent !== null) {
    const lowest = reservoirs.lowest
      ? en
        ? `; lowest ${reservoirs.lowest.nameEn} at ${reservoirs.lowest.percent.toFixed(1)}%`
        : `；最低為${reservoirs.lowest.nameZh}（${reservoirs.lowest.percent.toFixed(1)}%）`
      : "";
    figures.push({
      key: "reservoirs",
      label: en ? "Reservoir storage" : "水庫蓄水",
      value: reservoirs.percent.toFixed(1),
      unit: en ? "% full" : "% 滿",
      detail: en
        ? `${reservoirs.large} large reservoirs together${lowest}`
        : `${reservoirs.large} 座大型水庫合計${lowest}`,
      href: "/environment/reservoirs",
      older: reservoirs.status === "stale",
    });
  }
  return figures;
}

/** A cyclone being tracked and the latest felt earthquake, from the agency's
 *  own reports. A cyclone appears only while the agency lists one; an
 *  earthquake only if it was within the last week. With the feed down there is
 *  no figure, never a "none". The cyclone comes first and is marked as an
 *  alert; neither is a warning, and the wording says so. */
export function hazardFigures(
  hazards: HazardsResponse | null,
  language: Language,
  now: number,
): (TodayFigure & { alert?: boolean })[] {
  if (!hazards) return [];
  const en = language === "en";
  const figures: (TodayFigure & { alert?: boolean })[] = [];

  const cyclones = byStrength(hazards.typhoon.cyclones);
  if (cyclones.length) {
    const [first] = cyclones;
    const klass = cycloneClass(first.current?.maxWindMs ?? null);
    const age = first.current?.time
      ? ageWords(first.current.time, now, language)
      : null;
    const wind = first.current?.maxWindMs;
    const more = cyclones.length - 1;
    figures.push({
      key: "typhoon",
      label: en ? "Tropical cyclone" : "熱帶氣旋",
      value: cycloneName(first, language),
      unit: klass ? cycloneClassLabels[klass][language] : "",
      detail: [
        wind != null
          ? en
            ? `Winds up to ${wind} m/s`
            : `最大風速 ${wind} m/s`
          : null,
        age ? (en ? `position analysed ${age}` : `位置分析於${age}`) : null,
        more > 0
          ? en
            ? `${more} more being tracked`
            : `另有 ${more} 個受追蹤`
          : null,
        en
          ? "a map of the agency’s track, not a warning"
          : "這是氣象署路徑的地圖，不是警報",
      ]
        .filter(Boolean)
        .join(en ? "; " : "；"),
      href: "/explore?layers=typhoon",
      dot: "#4a3aa7",
      older: hazards.typhoon.status === "stale",
      alert: true,
    });
  }

  const quake = latestFeltQuake(hazards.earthquakes.events, now);
  if (quake && quake.magnitude !== null) {
    const top = quake.areas[0];
    const magnitude = quake.magnitude.toFixed(1);
    figures.push({
      key: "quake",
      label: en ? "Latest felt earthquake" : "最近的有感地震",
      value: en ? `M${magnitude}` : `規模 ${magnitude}`,
      unit: ageWords(quake.originTime, now, language) ?? "",
      detail: top
        ? en
          ? `Strongest shaking in ${countyName(top.county, "en")}, intensity ${intensityText(top.intensity, "en")}`
          : `最大震度：${top.county} ${intensityText(top.intensity, "zh")}`
        : en
          ? "Intensity not reported"
          : "未提供震度",
      href: "/explore?layers=earthquakes",
      dot: intensityColours[intensityBand(quake.maxIntensity)],
      older: hazards.earthquakes.status === "stale",
    });
  }
  return figures;
}

/** The newest reading time among the parts, or null. */
export function todayAsOf(today: TodaySummary): string | null {
  const times = [
    today.air.latest,
    today.weather.latest,
    today.reservoirs.latest,
  ].filter((time): time is string => !!time);
  return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null;
}
