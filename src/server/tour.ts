import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { nationalPm25 } from "@/content/air-history";
import { airCounty } from "@/data/air-county";
import { temperatureHistory } from "@/data/temperature";
import { projectPoint } from "@/lib/county-shapes";
import { buildTour, type CountyRef, type Tour } from "@/lib/tour";
import { atlasFacts } from "./facts";
import { loadPlants } from "./plants";

export interface TourPageData {
  counties: CountyRef[];
  tour: Tour;
  /** One zero-length segment per village, on the county map's drawing. */
  villageDots: string;
}

const atlas = path.join(process.cwd(), "public/data/atlas");
const readJson = async <T>(file: string) =>
  JSON.parse(await readFile(path.join(atlas, file), "utf8")) as T;

let cache: Promise<TourPageData> | null = null;
export function loadTour() {
  cache ??= (async () => {
    const [facts, plants, species, villages] = await Promise.all([
      atlasFacts(),
      loadPlants(),
      readJson<{ species: { countyCounts: Record<string, number> }[] }>(
        "wildlife.species.json",
      ),
      readJson<{
        features: { geometry: { coordinates: [number, number] } }[];
      }>("villages.geojson"),
    ]);
    const roadkill: Record<string, number> = {};
    for (const item of species.species)
      for (const [code, count] of Object.entries(item.countyCounts))
        roadkill[code] = (roadkill[code] ?? 0) + count;
    const dots = villages.features
      .map((feature) =>
        projectPoint(
          feature.geometry.coordinates[0],
          feature.geometry.coordinates[1],
        ),
      )
      .filter((point): point is [number, number] => point !== null)
      .map(([x, y]) => `M${x} ${y}h0`)
      .join("");
    const tour = buildTour({
      counties: facts.counties,
      air: airCounty,
      national: nationalPm25,
      temperature: temperatureHistory,
      forests: {
        year: facts.forests.year,
        counties: facts.forests.counties,
        unmapped: facts.forests.unavailable.map((county) => county.code),
      },
      roadkill,
      roadkillYears: {
        first: Number(facts.wildlife.firstDate.slice(0, 4)),
        last: Number(facts.wildlife.lastDate.slice(0, 4)),
      },
      culture: {
        villages: facts.culture.villages,
        peoples: facts.culture.peoples.length,
        byCounty: facts.culture.byCounty.map((row) => ({
          code: row.name,
          count: row.count,
        })),
      },
      taipei: {
        parks: facts.urban.parks,
        trees: plants.totalTrees,
        kinds: plants.rows.length,
      },
    });
    return { counties: facts.counties, tour, villageDots: dots };
  })();
  return cache;
}
