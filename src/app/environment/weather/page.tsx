import { WeatherNow } from "@/components/environment-now/weather-now";

export const metadata = {
  title: "What is the weather doing right now? · 此刻各地的天氣如何？",
  description:
    "The latest temperature, humidity, rain and wind readings from the Central Weather Administration’s stations, county by county, with the limits of each figure.",
};

export default function Page() {
  return <WeatherNow />;
}
