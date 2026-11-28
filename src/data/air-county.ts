import raw from "./air-county.json";

/** County PM2.5 annual averages from the ministry's open-data table, typed.
 *  The file is written by scripts/build-air-county.mjs and is never fetched at
 *  run time. */
export interface AirCountyData {
  source: string;
  sourceUrl: string;
  licence: string;
  method: string;
  fetchedAt: string;
  firstYear: number;
  lastYear: number;
  national: Record<string, number | null>;
  counties: {
    code: string;
    zh: string;
    en: string;
    values: Record<string, number | null>;
  }[];
}

export const airCounty = raw as unknown as AirCountyData;
