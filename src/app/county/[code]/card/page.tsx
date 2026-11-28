import { notFound } from "next/navigation";
import { CountyCardSheet } from "@/components/county-card/county-card-sheet";
import { silhouette } from "@/lib/silhouette";
import {
  loadCountyCard,
  loadCountyCodes,
  loadOutlines,
} from "@/server/county-card";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await loadCountyCodes()).map((code) => ({ code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await loadCountyCard(code);
  return {
    title: data ? `Report card · ${data.en} ${data.zh}` : "Report card",
    // A printout, not a page to find in a search: the county profile is.
    robots: { index: false },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [data, outlines] = await Promise.all([
    loadCountyCard(code),
    loadOutlines(),
  ]);
  if (!data) notFound();
  const outline = outlines[code];
  return (
    <CountyCardSheet
      data={data}
      shape={outline ? silhouette(outline, { width: 150, height: 190 }) : null}
    />
  );
}
