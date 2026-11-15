import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Counties, Observation } from "./types";
export const TAIWAN_BOUNDS: [[number, number], [number, number]] = [
  [117.8, 21.7],
  [122.2, 26.6],
];
export function validCoordinate(
  longitude: unknown,
  latitude: unknown,
): boolean {
  return (
    typeof longitude === "number" &&
    typeof latitude === "number" &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= 117 &&
    longitude <= 125 &&
    latitude >= 20 &&
    latitude <= 27
  );
}
export function inCounty(
  observation: Observation,
  code: string,
  counties: Counties,
): boolean {
  if (!code) return true;
  const county = counties.features.find(
    (f) => f.properties.COUNTYCODE === code,
  );
  return (
    !!county &&
    booleanPointInPolygon([observation.longitude, observation.latitude], county)
  );
}
export function boundsOfCoordinates(
  coordinates: unknown,
): [[number, number], [number, number]] {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;
  function visit(value: unknown) {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      west = Math.min(west, value[0]);
      east = Math.max(east, value[0]);
      south = Math.min(south, value[1]);
      north = Math.max(north, value[1]);
    } else value.forEach(visit);
  }
  visit(coordinates);
  return [
    [west, south],
    [east, north],
  ];
}
