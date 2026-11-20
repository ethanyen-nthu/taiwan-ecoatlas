import type { AtlasFacts, SpeciesCount, Tally } from "@/server/facts";

export interface CountyRow {
  code: string;
  en: string;
  zh: string;
  wildlife: number;
  wildlifeRank: number;
  villages: number;
  villagesRank: number;
  forestShare: number | null;
  forestRank: number | null;
}
export interface CountyDetail extends CountyRow {
  species: SpeciesCount[];
  groups: Tally[];
  forest: {
    forestKm2: number;
    builtUpKm2: number;
    agricultureKm2: number;
    coveragePct: number;
    areaKm2: number;
  } | null;
  urban: { parks: number; trees: number; riverside: number } | null;
  /** How many counties have each dataset, for "x of N". */
  of: { wildlife: number; villages: number; forest: number };
}

function rank(values: Map<string, number>, code: string) {
  const mine = values.get(code) ?? 0;
  if (mine <= 0) return 0;
  return [...values.values()].filter((value) => value > mine).length + 1;
}

export function countyRows(facts: AtlasFacts): CountyRow[] {
  const wildlife = new Map(
    facts.wildlife.byCounty.map((r) => [r.name, r.count]),
  );
  const villages = new Map(
    facts.culture.byCounty.map((r) => [r.name, r.count]),
  );
  const forest = new Map(
    facts.forests.counties.map((r) => [r.code, r.sharePct]),
  );
  return facts.counties
    .map((county) => ({
      ...county,
      wildlife: wildlife.get(county.code) ?? 0,
      wildlifeRank: rank(wildlife, county.code),
      villages: villages.get(county.code) ?? 0,
      villagesRank: rank(villages, county.code),
      forestShare: forest.get(county.code) ?? null,
      forestRank: forest.has(county.code) ? rank(forest, county.code) : null,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function countyDetail(
  facts: AtlasFacts,
  code: string,
): CountyDetail | null {
  const row = countyRows(facts).find((item) => item.code === code);
  if (!row) return null;
  const forest = facts.forests.counties.find((item) => item.code === code);
  return {
    ...row,
    species: facts.wildlife.speciesByCounty[code] ?? [],
    groups: (facts.culture.groupsByCounty[code] ?? []).slice(0, 5),
    forest: forest
      ? {
          forestKm2: forest.forestKm2,
          builtUpKm2: forest.builtUpKm2,
          agricultureKm2: forest.agricultureKm2,
          coveragePct: forest.coveragePct,
          areaKm2: forest.areaKm2,
        }
      : null,
    urban:
      code === "63000"
        ? {
            parks: facts.urban.parks,
            trees: facts.urban.parkTrees,
            riverside: facts.urban.riversideTrees,
          }
        : null,
    of: {
      wildlife: facts.wildlife.byCounty.length,
      villages: facts.culture.byCounty.length,
      forest: facts.forests.counties.length,
    },
  };
}
