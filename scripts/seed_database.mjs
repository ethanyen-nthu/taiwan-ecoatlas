// Node >=22.18. Secrets are read only from environment, never arguments or logs.
import { readFile } from "node:fs/promises";
import { sources } from "../src/lib/sources.ts";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || new URL(url).protocol !== "https:")
  throw new Error("Configure Supabase server environment first");
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};
async function post(path, body) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `Database operation failed (HTTP ${response.status}); check migration and permissions`,
    );
}
await post(
  "environmental_sources?on_conflict=id",
  sources.map((s) => ({
    id: s.id,
    name_en: s.name.en,
    name_zh: s.name.zh,
    agency_en: s.agency.en,
    agency_zh: s.agency.zh,
    original_url: s.url,
    dataset_identifier: s.datasetId,
    licence: s.licence,
    expected_update_frequency: s.frequency.en,
    published: s.stage === "ready",
  })),
);
const counties = JSON.parse(
  await readFile(
    new URL("../public/data/counties.geojson", import.meta.url),
    "utf8",
  ),
);
await post("rpc/import_counties", { payload: counties });
console.info(
  "Seeded source registry and 22 official counties. No fabricated observations inserted.",
);
