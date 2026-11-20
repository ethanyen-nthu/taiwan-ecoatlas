import { notFound } from "next/navigation";
import { PlantProfile } from "@/components/plants/plants-views";
import { loadPlants } from "@/server/plants";

export async function generateStaticParams() {
  const { rows } = await loadPlants();
  return rows.map((row) => ({ slug: row.name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  const { rows } = await loadPlants();
  const row = rows.find((item) => item.name === name);
  return {
    title: row
      ? `${row.name}${row.en ? ` · ${row.en}` : ""}${row.sci ? ` (${row.sci})` : ""}`
      : "Tree not found",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  const { rows } = await loadPlants();
  const row = rows.find((item) => item.name === name);
  if (!row) notFound();
  return <PlantProfile row={row} />;
}
