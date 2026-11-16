import type { AtlasCollection, AtlasFeature } from "./atlas-types";
import { measurement } from "./transform";
import { validCoordinate } from "./geo";

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key.toLowerCase(), item]),
      )
    : {};
const string = (value: unknown) =>
  typeof value === "string"
    ? value.trim()
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "";
const aliases: Record<string, string> = {
  DO: "do",
  DISSOLVEDOXYGEN: "do",
  BOD: "bod",
  BOD5: "bod",
  BIOCHEMICALOXYGENDEMAND: "bod",
  SS: "ss",
  SUSPENDEDSOLIDS: "ss",
  NH3N: "nh3n",
  AMMONIANITROGEN: "nh3n",
  RPI: "rpi",
  RIVERPOLLUTIONINDEX: "rpi",
};
export function sampleDate(value: unknown): string | null {
  const text = string(value).replaceAll("/", "-").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const timestamp = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === text
    ? text
    : null;
}
export function parseRiver(
  payload: unknown,
  countyForName: (name: string) => string | null = () => null,
) {
  const rows = Array.isArray(payload) ? payload : object(payload).records;
  if (!Array.isArray(rows) || !rows.length)
    throw new Error("Invalid river payload");
  const samples = new Map<string, AtlasFeature>();
  let excluded = 0,
    unrecognised = 0,
    duplicates = 0;
  for (const raw of rows) {
    const row = object(raw);
    const code = (string(row.itemengabbreviation) || string(row.itemengname))
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const indicator = aliases[code];
    if (!indicator) {
      unrecognised++;
      continue;
    }
    const id = string(row.siteid),
      date = sampleDate(row.sampledate);
    const longitude = measurement(row.twd97lon, 117, 125),
      latitude = measurement(row.twd97lat, 20, 27);
    if (!id || !date || !validCoordinate(longitude, latitude)) {
      excluded++;
      continue;
    }
    // EPSG:3824 -> EPSG:4326, EPSG operation 1549 (TWD97 to WGS 84 (1)).
    // PROJ confirms a no-op in geographic coordinates, with stated 1 m accuracy.
    // The original source CRS remains recorded; no TM2 coordinates are relabelled.
    const key = `${id}:${date}`;
    let feature = samples.get(key);
    if (!feature) {
      feature = {
        type: "Feature",
        id: key,
        geometry: { type: "Point", coordinates: [longitude!, latitude!] },
        properties: {
          id: key,
          sourceId: "WQX_P_01",
          stationId: id,
          title: string(row.siteengname) || string(row.sitename) || id,
          ...(string(row.sitename) ? { titleZh: string(row.sitename) } : {}),
          countyCode: countyForName(string(row.countyen) || string(row.county)),
          county: string(row.countyen) || string(row.county),
          date,
          category:
            string(row.riveren) || string(row.river) || "River not reported",
          river: string(row.riveren) || string(row.river),
          basin: string(row.basinen) || string(row.basin),
          publishedAt: null,
          sourceCrs: "EPSG:3824",
          transformOperation: "EPSG:1549; stated accuracy 1 m",
          do: null,
          bod: null,
          ss: null,
          nh3n: null,
          rpi: null,
        },
      };
      samples.set(key, feature);
    }
    if (`${indicator}Raw` in feature.properties) {
      duplicates++;
      continue;
    }
    const unit = string(row.itemunit).replace(/\s/g, "").toLowerCase();
    const recognisedUnit =
      indicator === "rpi" ||
      ["mg/l", "mgl-1", "mg/liter", "mg/litre"].includes(unit);
    const value = recognisedUnit
      ? measurement(
          row.itemvalue,
          indicator === "rpi" ? 1 : 0,
          indicator === "rpi" ? 10 : Infinity,
        )
      : null;
    feature.properties[indicator] = value;
    feature.properties[`${indicator}Raw`] = string(row.itemvalue);
    feature.properties[`${indicator}Unit`] = string(row.itemunit);
    feature.properties[`${indicator}Note`] =
      string(row.noteen) ||
      string(row.note) ||
      (value === null
        ? "Missing, censored or unsupported-unit value; not treated as zero"
        : "");
  }
  if (!samples.size) throw new Error("No valid river samples");
  const features = [...samples.values()].sort((a, b) =>
    (b.properties.date || "").localeCompare(a.properties.date || ""),
  );
  return {
    collection: { type: "FeatureCollection", features } as AtlasCollection,
    excluded,
    unrecognised,
    duplicates,
    sourceRows: rows.length,
  };
}
