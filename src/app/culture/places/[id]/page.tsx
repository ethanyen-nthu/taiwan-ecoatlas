import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { AtlasProfile, type CulturalStudy } from "@/components/atlas-profile";
import { VillageProfile } from "@/components/culture/village-profile";
import type { AtlasCollection, AtlasManifest } from "@/lib/atlas-types";
import { villageData } from "@/server/culture";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const village = await villageData(id);
  return village
    ? {
        title: `${village.titleZh} · ${village.title}`,
        description: `${village.group} village listing in ${village.countyName ?? "Taiwan"}${village.township ? ` ${village.township}` : ""}: the people, the place, nearby villages and what the record does and does not say.`,
      }
    : { title: "Cultural place and source" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const village = await villageData(id);
  if (village) return <VillageProfile data={village} />;
  const directory = path.join(process.cwd(), "public/data/atlas");
  const [trails, studies, manifest] = await Promise.all([
    readFile(
      path.join(directory, "public-historic-trails.geojson"),
      "utf8",
    ).then((s) => JSON.parse(s) as AtlasCollection),
    readFile(path.join(directory, "cultural-trails.json"), "utf8").then(
      (s) => JSON.parse(s) as CulturalStudy[],
    ),
    readFile(path.join(directory, "culture.metadata.json"), "utf8").then(
      (s) => JSON.parse(s) as AtlasManifest,
    ),
  ]);
  const study = studies.find((record) => record.id === id);
  if (study) return <AtlasProfile profile={{ kind: "study", study }} />;
  const feature = trails.features.find((record) => record.properties.id === id);
  if (!feature) notFound();
  const dataset = manifest.datasets.find(
    (record) => record.sourceId === feature.properties.sourceId,
  );
  if (!dataset) notFound();
  return (
    <AtlasProfile
      profile={{
        kind: "culture",
        properties: feature.properties,
        datasetTitle: dataset.title,
        sourceUrl: dataset.sourceUrl,
        licence: dataset.licence,
        licenceUrl: dataset.licenceUrl,
        limitation: dataset.limitation,
      }}
    />
  );
}
