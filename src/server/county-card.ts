import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { countyCard, type CountyCardData } from "@/lib/county-card";
import type { OutlineFile } from "@/lib/outline-map";
import { loadTour } from "./tour";

export async function loadCountyCard(
  code: string,
): Promise<CountyCardData | null> {
  const { counties, tour } = await loadTour();
  return countyCard(tour, counties, code);
}

export async function loadCountyCodes(): Promise<string[]> {
  const { counties } = await loadTour();
  return counties.map((county) => county.code);
}

let outlines: Promise<OutlineFile> | null = null;
/** The committed county outlines, read once. */
export function loadOutlines(): Promise<OutlineFile> {
  outlines ??= readFile(
    path.join(process.cwd(), "public/data/county-outlines.json"),
    "utf8",
  ).then((text) => JSON.parse(text) as OutlineFile);
  return outlines;
}

const font = (file: string) =>
  readFile(path.join(process.cwd(), "src/assets/fonts", file));
/** The two weights the share images are drawn with. */
export const cardFonts = () =>
  Promise.all([font("card-regular.otf"), font("card-bold.otf")]);
