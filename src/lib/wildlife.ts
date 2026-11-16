import type { Localized } from "./types";

export interface WildlifeSpecies {
  id: string;
  name: string;
  scientificName: string;
  acceptedName: string | null;
  category: string;
  family: string | null;
  taxonKey: number | null;
  count: number;
  firstDate: string;
  lastDate: string;
  yearCounts: Record<string, number>;
  countyCounts: Record<string, number>;
  sourceUrl: string;
  licence: string;
}

export const wildlifeClasses: Record<string, Localized> = {
  Amphibia: { en: "Amphibians", zh: "兩棲類" },
  Aves: { en: "Birds", zh: "鳥類" },
  Mammalia: { en: "Mammals", zh: "哺乳類" },
  Reptilia: { en: "Reptiles", zh: "爬行類" },
  Malacostraca: {
    en: "Crabs and other malacostracans",
    zh: "蟹類與其他軟甲綱",
  },
};

export const wildlifePrivacy: Localized = {
  en: "These are 10 km grid-cell centres, not sighting locations. Source coordinate accuracy is unknown. Counts reflect a screened historical reporting subset, not wildlife abundance or roadkill risk.",
  zh: "點位為 10 公里網格中心，並非發現位置；來源座標準確度未知。數量代表經篩選的歷史通報子集，不代表野生動物數量或路死風險。",
};

export function validSpeciesId(value: string): boolean {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{8}$/.test(value) && value.length <= 100
  );
}

export function wildlifeTaxonUrl(
  species: Pick<WildlifeSpecies, "taxonKey">,
): string | null {
  return typeof species.taxonKey === "number" &&
    Number.isSafeInteger(species.taxonKey) &&
    species.taxonKey > 0
    ? `https://www.gbif.org/species/${species.taxonKey}`
    : null;
}
