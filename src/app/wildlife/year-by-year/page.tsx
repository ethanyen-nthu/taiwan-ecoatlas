import { WildlifeYears } from "@/components/trends/wildlife-years";

export const metadata = {
  title: "Is roadkill getting worse? · 路死變多了嗎？",
  description:
    "Roadkill records in the atlas for 2014 to 2017 by county, animal group and month, and why a rise in records is not the same as a rise in roadkill.",
};

export default function Page() {
  return <WildlifeYears />;
}
