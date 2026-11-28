import { TaiwanTour } from "@/components/tour/taiwan-tour";
import { loadCountyShapes } from "@/server/county-shapes";
import { loadTour } from "@/server/tour";

export const metadata = {
  title: "Taiwan in five minutes · 五分鐘看臺灣",
  description:
    "A scrolling tour of what the open data shows: cleaner air, a warmer island, uneven forests, where roadkill is reported, sixteen Indigenous peoples and one city's trees, each with its limits.",
};

export default async function Page() {
  const [shapes, data] = await Promise.all([loadCountyShapes(), loadTour()]);
  return (
    <TaiwanTour
      shapes={shapes}
      counties={data.counties}
      tour={data.tour}
      villageDots={data.villageDots}
    />
  );
}
