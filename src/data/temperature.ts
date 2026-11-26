import type { TempData } from "@/lib/temperature-history";
import raw from "./temperature-history.json";

/** The modelled temperature history, typed. The file is written by
 *  scripts/build-temperature-history.mjs and is never fetched at run time. */
export const temperatureHistory = raw as unknown as TempData;
