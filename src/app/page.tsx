import { Home } from "@/components/home";
import { snapshotCounties } from "@/lib/county-snapshot";
import { atlasFacts } from "@/server/facts";
import { journeyMarks } from "@/server/journey";
import { loadPlants } from "@/server/plants";

export default async function Page() {
  const [facts, marks, plants] = await Promise.all([
    atlasFacts(),
    journeyMarks(),
    loadPlants(),
  ]);
  return (
    <Home
      marks={marks}
      counties={snapshotCounties(facts, {
        trees: plants.totalTrees,
        kinds: plants.rows.length,
      })}
      facts={{
        wildlifeRecords: facts.wildlife.records,
        species: facts.wildlife.species,
        firstYear: facts.wildlife.firstDate.slice(0, 4),
        lastYear: facts.wildlife.lastDate.slice(0, 4),
        villages: facts.culture.villages,
        groups: facts.culture.groups.length,
        parks: facts.urban.parks,
        parkTrees: facts.urban.parkTrees,
        plantTrees: plants.totalTrees,
        plantKinds: plants.rows.length,
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
