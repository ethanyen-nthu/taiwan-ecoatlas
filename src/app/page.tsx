import { Home } from "@/components/home";
import { atlasFacts } from "@/server/facts";

export default async function Page() {
  const facts = await atlasFacts();
  return (
    <Home
      facts={{
        wildlifeRecords: facts.wildlife.records,
        species: facts.wildlife.species,
        firstYear: facts.wildlife.firstDate.slice(0, 4),
        lastYear: facts.wildlife.lastDate.slice(0, 4),
        villages: facts.culture.villages,
        groups: facts.culture.groups.length,
        parks: facts.urban.parks,
        parkTrees: facts.urban.parkTrees,
        forestTop: facts.forests.counties[0]
          ? {
              en: facts.forests.counties[0].en,
              zh: facts.forests.counties[0].zh,
              sharePct: facts.forests.counties[0].sharePct,
            }
          : null,
      }}
    />
  );
}
