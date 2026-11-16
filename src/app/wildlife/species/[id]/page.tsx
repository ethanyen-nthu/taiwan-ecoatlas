import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import {
  AtlasProfile,
  type WildlifeSpeciesProfile,
} from "@/components/atlas-profile";
import type { AtlasManifest } from "@/lib/atlas-types";
import type { Counties } from "@/lib/types";

export const metadata = { title: "Species observation evidence" };

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
