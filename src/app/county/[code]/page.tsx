import { notFound } from "next/navigation";
import { CountyProfile } from "@/components/county-profile";
import { countyDetail, countyRows } from "@/lib/county-rows";
import { shareDescription } from "@/lib/county-card";
import { loadCountyCard } from "@/server/county-card";
import { atlasFacts } from "@/server/facts";

export const dynamicParams = false;

export async function generateStaticParams() {
  return countyRows(await atlasFacts()).map((row) => ({ code: row.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const row = countyRows(await atlasFacts()).find((item) => item.code === code);
  if (!row) return { title: "County" };
  const title = `${row.en} · ${row.zh}`;
  const card = await loadCountyCard(code);
  const description = card ? shareDescription(card) : undefined;
  // The picture comes from this folder's opengraph-image file.
  return {
    title,
    description,
    openGraph: {
      title: `${title} · Taiwan EcoAtlas`,
      description,
      url: `/county/${code}`,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const facts = await atlasFacts();
  const county = countyDetail(facts, code);
  if (!county) notFound();
  return (
    <CountyProfile
      county={county}
      all={countyRows(facts).map(({ code, en, zh }) => ({ code, en, zh }))}
    />
  );
}
