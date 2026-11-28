import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { countyShapes, type ShapeSet } from "@/lib/county-shapes";
import type { OutlineFile } from "@/lib/outline-map";

let cached: Promise<ShapeSet> | null = null;

/** The county drawings, built once from the committed outline file. */
export function loadCountyShapes(): Promise<ShapeSet> {
  cached ??= readFile(
    path.join(process.cwd(), "public/data/county-outlines.json"),
    "utf8",
  ).then((text) => countyShapes(JSON.parse(text) as OutlineFile));
  return cached;
}
