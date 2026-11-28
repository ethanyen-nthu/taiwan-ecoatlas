import { AirTrend } from "@/components/air-trend/air-trend";
import { loadCountyShapes } from "@/server/county-shapes";

export const metadata = {
  title: "Has Taiwan’s air improved? · 臺灣的空氣有變好嗎？",
  description:
    "Taiwan’s annual average PM2.5 from 2013 to 2025 from Ministry of Environment figures, with notes on method, weather, changing standards and what the numbers cannot show.",
};

export default async function Page() {
  return <AirTrend shapes={await loadCountyShapes()} />;
}
