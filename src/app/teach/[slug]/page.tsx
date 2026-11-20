import { notFound } from "next/navigation";
import { LessonView } from "@/components/teach/lesson-view";
import { buildLessons } from "@/content/lessons";
import { lessonMeta } from "@/content/lesson-index";
import { atlasFacts } from "@/server/facts";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessonMeta.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = lessonMeta.find((item) => item.slug === slug);
  return lesson
    ? { title: `${lesson.title.en} · ${lesson.title.zh}` }
    : { title: "Lesson" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = buildLessons(await atlasFacts()).find(
    (item) => item.slug === slug,
  );
  if (!lesson) notFound();
  return <LessonView lesson={lesson} />;
}
