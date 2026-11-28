import { TemperatureTrend } from "@/components/trends/temperature-trend";
import { loadCountyShapes } from "@/server/county-shapes";

export const metadata = {
  title: "Is Taiwan getting warmer? · 臺灣有變暖嗎？",
  description:
    "Yearly, summer and winter temperature in each county since 1950, from the ERA5-Land reanalysis served by Open-Meteo, with what a model can and cannot show.",
};

export default async function Page() {
  return <TemperatureTrend shapes={await loadCountyShapes()} />;
}
