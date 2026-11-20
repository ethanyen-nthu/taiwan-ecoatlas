import { notFound } from "next/navigation";
import { CountyProfile } from "@/components/county-profile";
import { countyDetail, countyRows } from "@/lib/county-rows";
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
  return { title: row ? `${row.en} · ${row.zh}` : "County" };
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
