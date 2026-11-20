"use client";
import Link from "next/link";
import { glossary } from "@/content/glossary";
import { lessonMeta, type L } from "@/content/lesson-index";
import { useLanguage } from "../providers";
import { Footer } from "../footer";
import "./teach.css";

export function GlossaryView() {
  const { language, t } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  return (
    <main id="main" className="document-page teach glossary">
      <p className="teach-crumb">
        <Link href="/teach">{t("Teach", "教學")}</Link>
        <span aria-hidden="true"> / </span>
        {t("Glossary", "名詞解釋")}
      </p>
      <header className="teach-head" data-neutral="">
        <div className="teach-head-copy">
          <h1>{t("Glossary", "名詞解釋")}</h1>
          <p>
            {t(
              "The terms students meet in the atlas and the lessons, in plain language.",
              "學生在平台與課程中會遇到的名詞，以白話說明。",
            )}
          </p>
        </div>
        <span className="teach-stripe" aria-hidden="true" />
      </header>
      <dl className="glossary-list">
        {glossary.map((term) => {
          const lesson = lessonMeta.find((item) => item.slug === term.lesson);
          return (
            <div key={term.id} id={term.id}>
              <dt>{tl(term.term)}</dt>
              <dd>
                {tl(term.meaning)}
                {lesson && (
                  <>
                    {" "}
                    <Link href={`/teach/${lesson.slug}`}>
                      {t("Used in:", "出現於：")} {tl(lesson.title)}
                    </Link>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <Footer />
    </main>
  );
}
