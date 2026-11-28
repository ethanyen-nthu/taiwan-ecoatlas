import type { MapScale } from "./county-shapes";

/** Sand to plum: more fine particles, darker. Plum, not blue, so a PM2.5 map
 *  is never mistaken for the temperature map, where blue means cooler. */
export const hazeScale: MapScale = {
  breaks: [6, 9, 12, 15, 18],
  colors: ["#eee1cf", "#e0c3ad", "#c99a8c", "#a96d73", "#80466a", "#552d4f"],
};
