import { ForestTrend } from "@/components/trends/forest-trend";

export const metadata = {
  title: "Has Taiwan’s forest grown? · 臺灣的森林有變多嗎？",
  description:
    "Forest cover in the Forestry Bureau’s 3rd and 4th national inventories, forest per person, and why the atlas’s own 2023 map is not a third point.",
};

export default function Page() {
  return <ForestTrend />;
}
