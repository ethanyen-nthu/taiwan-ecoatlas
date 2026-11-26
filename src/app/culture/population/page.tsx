import { PopulationTrend } from "@/components/trends/population-trend";

export const metadata = {
  title: "Indigenous population over time · 原住民人口的變化",
  description:
    "Registered Indigenous people at the end of 2011, 2020 and 2025 from Ministry of the Interior figures, with notes on who is registered.",
};

export default function Page() {
  return <PopulationTrend />;
}
