import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import {
  AtlasProfile,
  type WildlifeSpeciesProfile,
} from "@/components/atlas-profile";
import { findSpeciesInfo } from "@/content/species-info";
import type { AtlasManifest } from "@/lib/atlas-types";
import type { Counties } from "@/lib/types";

async function loadSpecies() {
  const text = await readFile(
    path.join(process.cwd(), "public/data/atlas/wildlife.species.json"),
    "utf8",
  );
  return (JSON.parse(text) as { species: WildlifeSpeciesProfile[] }).species;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = (await loadSpecies()).find((item) => item.id === id);
  if (!record) return { title: "Species observation evidence" };
  const info = findSpeciesInfo(record.scientificName || record.name);
  const names = [info?.zh, info?.en].filter(Boolean).join(" · ");
  return {
    title: `${names || record.name}${record.scientificName ? ` (${record.scientificName})` : ""}`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const directory = path.join(process.cwd(), "public/data");
  const [index, manifest, counties] = await Promise.all([
    readFile(path.join(directory, "atlas/wildlife.species.json"), "utf8").then(
      (s) => JSON.parse(s) as { species: WildlifeSpeciesProfile[] },
    ),
    readFile(path.join(directory, "atlas/wildlife.metadata.json"), "utf8").then(
      (s) => JSON.parse(s) as AtlasManifest,
    ),
    readFile(path.join(directory, "counties.geojson"), "utf8").then(
      (s) => JSON.parse(s) as Counties,
    ),
  ]);
  const species = index.species.find((record) => record.id === id);
  if (!species) notFound();
  const dataset = manifest.datasets.find((record) => record.id === "wildlife");
  if (!dataset) notFound();
  return (
    <AtlasProfile
      profile={{
        kind: "species",
        species,
        counties: counties.features.map((county) => ({
          code: county.properties.COUNTYCODE,
          name: {
            en: county.properties.COUNTYENG,
            zh: county.properties.COUNTYNAME,
          },
        })),
        limitation: dataset.limitation,
        licenceUrl: dataset.licenceUrl,
      }}
    />
  );
}
