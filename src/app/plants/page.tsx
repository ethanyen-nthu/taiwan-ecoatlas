import { PlantsGuide } from "@/components/plants/plants-views";
import { loadPlants } from "@/server/plants";

export const metadata = {
  title: "Plants · 植物",
  description:
    "The trees of Taipei’s parks and riverbanks: what each kind is, where it comes from and where to find it.",
};

export default async function Page() {
  const { rows, totalTrees } = await loadPlants();
  const compact = rows.map((row) => ({
    ...row,
    districts: [],
    topPlaces: [],
  }));
  return <PlantsGuide rows={compact} totalTrees={totalTrees} />;
}
