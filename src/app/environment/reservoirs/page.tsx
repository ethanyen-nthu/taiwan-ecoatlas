import { ReservoirsNow } from "@/components/environment-now/reservoirs-now";

export const metadata = {
  title: "How full are Taiwan’s reservoirs? · 臺灣的水庫現在蓄了多少水？",
  description:
    "The latest storage and water level of Taiwan’s reservoirs from the Water Resources Agency, how full each large one is, and what a one-day feed cannot show.",
};

export default function Page() {
  return <ReservoirsNow />;
}
