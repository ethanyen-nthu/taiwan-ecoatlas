import type { Language } from "@/lib/types";
import type { TodaySummary } from "@/lib/today";
import { aqiColorForValue } from "@/lib/transform";

export interface TodayFigure {
  key: "air" | "temperature" | "rain" | "reservoirs";
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

/** The newest reading time among the parts, or null. */
export function todayAsOf(today: TodaySummary): string | null {
  const times = [
    today.air.latest,
    today.weather.latest,
    today.reservoirs.latest,
  ].filter((time): time is string => !!time);
  return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null;
}
