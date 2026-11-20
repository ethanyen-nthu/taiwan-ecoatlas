import { notFound } from "next/navigation";
import { PeopleProfileView } from "@/components/culture/peoples-views";
import { peopleProfiles, profileBySlug } from "@/content/peoples";
import { peoplePageData } from "@/server/culture";

export const dynamicParams = false;

export function generateStaticParams() {
  return peopleProfiles.map((people) => ({ slug: people.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const people = profileBySlug.get(slug);
  return people
    ? {
        title: `${people.name.en} · ${people.name.zh}`,
        description: people.summary.en,
      }
    : { title: "Indigenous people" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = profileBySlug.get(slug);
  const data = await peoplePageData(slug);
  if (!profile || !data) notFound();
  return <PeopleProfileView profile={profile} data={data} />;
}
