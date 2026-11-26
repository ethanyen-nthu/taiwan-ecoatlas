import type { AtlasFacts } from "@/server/facts";
import { countyDetail, countyRows } from "./county-rows";

/** Taipei City's county code: the only county the urban and tree inventories cover. */
export const taipeiCode = "63000";

/**
 * What the landing page's county picker needs for one county: the current
 * figure for each subject, each with its rank among the counties that have
 * data. A subject the county has no data for is null, never zero.
 */
export interface SnapshotCounty {
  code: string;
  en: string;
  zh: string;
  wildlife: { count: number; rank: number; of: number };
  villages: { count: number; rank: number; of: number };
  forest: {
    sharePct: number;
    rank: number;
    of: number;
    forestKm2: number;
  } | null;
  urban: { parks: number; trees: number; riverside: number } | null;
  plants: { kinds: number; trees: number } | null;
}

export function snapshotCounties(
  facts: AtlasFacts,
  plants: { trees: number; kinds: number },
): SnapshotCounty[] {
  return countyRows(facts).map((row) => {
    const detail = countyDetail(facts, row.code)!;
    return {
      code: row.code,
      en: row.en,
      zh: row.zh,
      wildlife: {
        count: detail.wildlife,
        rank: detail.wildlifeRank,
        of: detail.of.wildlife,
      },
      villages: {
        count: detail.villages,
        rank: detail.villagesRank,
        of: detail.of.villages,
      },
      forest:
        detail.forest && detail.forestShare !== null
          ? {
              sharePct: detail.forestShare,
              rank: detail.forestRank ?? 0,
              of: detail.of.forest,
              forestKm2: detail.forest.forestKm2,
            }
          : null,
      urban: detail.urban,
      plants: row.code === taipeiCode ? plants : null,
    };
  });
}
