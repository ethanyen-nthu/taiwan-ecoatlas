import { PeoplesIndex } from "@/components/culture/peoples-views";
import { peopleVillageCounts } from "@/server/culture";

export const metadata = {
  title: "Sixteen peoples · 十六個族群",
  description:
    "Who the Indigenous peoples named in the atlas are, where they live, how each came to be recognised, and the history and ideas worth knowing before reading a dot on the map.",
};

export default async function Page() {
  const counts = await peopleVillageCounts();
  return <PeoplesIndex counts={Object.fromEntries(counts)} />;
}
