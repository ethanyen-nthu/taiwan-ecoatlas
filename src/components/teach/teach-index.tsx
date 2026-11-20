"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Bird,
  BookOpen,
  Mountain,
  Sprout,
  TreePine,
  Wind,
} from "lucide-react";
import {
  lessonMeta,
  trackLabel,
  type L,
  type Track,
} from "@/content/lesson-index";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { useLanguage } from "../providers";
import { Footer } from "../footer";
import "./teach.css";

const icons = {
  environment: Wind,
  forests: TreePine,
  wildlife: Bird,
  culture: Mountain,
  urban: Sprout,
} as const;

const groups: Track[] = ["es", "culture", "both"];

export function TeachIndex() {
  const { language, t } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  return (
    <main id="main" className="document-page teach">
      <header className="teach-head" data-neutral="">
        <div className="teach-head-copy">
          <h1>{t("Teach with the atlas", "用地圖來教學")}</h1>
          <p>
            {t(
              "Ready-to-run lessons for lectures, seminars and assignments in environmental science and cultural studies. Each one opens real map views, asks questions the data can and cannot answer, and shows its sources.",
              "為環境科學與文化研究的講課、研討與作業準備的現成課程。每一課都會開啟真實的地圖畫面，提出資料能回答與無法回答的問題，並標明來源。",
            )}
          </p>
        </div>
        <svg
          className="teach-island"
          viewBox={islandViewBox}
          aria-hidden="true"
          focusable="false"
        >
          <path d={islandPath} />
        </svg>
        <span className="teach-stripe" aria-hidden="true" />
      </header>

      <section className="teach-how" aria-labelledby="how-heading">
        <h2 id="how-heading">{t("Three ways to use it", "三種使用方式")}</h2>
        <ul>
          <li>
            <strong>{t("In a lecture", "在講課中")}</strong>
            <span>
              {t(
                "Project a lesson and step through its map links. Each link opens the exact view, so nobody is searching for the right filter in front of the class.",
                "投影一課並依序開啟其地圖連結。每個連結都直接開啟指定畫面，不必當著全班尋找篩選條件。",
              )}
            </span>
          </li>
          <li>
            <strong>{t("In class activities", "在課堂活動中")}</strong>
            <span>
              {t(
                "Switch to the student handout view and print it. Students get the steps and questions without the instructor notes.",
                "切換為學生講義檢視並列印。學生拿到步驟與討論題，而不含教師備註。",
              )}
            </span>
          </li>
          <li>
            <strong>{t("As assignments", "作為作業")}</strong>
            <span>
              {t(
                "Every lesson ends with an assessment idea. Students can copy a link to their own map view and cite the lesson and its data sources.",
                "每一課都附評量構想。學生可複製自己地圖畫面的連結，並引用本課與其資料來源。",
              )}
            </span>
          </li>
        </ul>
      </section>

      {groups.map((track) => {
        const items = lessonMeta.filter((lesson) => lesson.track === track);
        if (!items.length) return null;
        return (
          <section key={track} className="teach-group">
            <h2>{tl(trackLabel[track])}</h2>
            <ul className="subject-tiles teach-tiles">
              {items.map((lesson) => {
                const Icon = icons[lesson.subject];
                return (
                  <li key={lesson.slug} data-tone={lesson.subject}>
                    <Link href={`/teach/${lesson.slug}`}>
                      <svg
                        className="subject-tile-island"
                        viewBox={islandViewBox}
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d={islandPath} />
                      </svg>
                      <span className="subject-tile-icon" aria-hidden="true">
                        <Icon size={22} strokeWidth={1.6} />
                      </span>
                      <span className="subject-tile-title">
                        {tl(lesson.title)}
                      </span>
                      <span className="subject-tile-number">
                        {language === "en"
                          ? `${lesson.minutes} min`
                          : `${lesson.minutes} 分鐘`}
                      </span>
                      <span className="subject-tile-label">
                        {tl(lesson.summary)}
                      </span>
                      <span className="subject-tile-go">
                        {t("Open the lesson", "開啟課程")}
                        <ArrowUpRight size={16} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="teach-more" aria-labelledby="more-heading">
        <h2 id="more-heading">{t("Also for teaching", "其他教學資源")}</h2>
        <ul>
          <li>
            <BookOpen size={18} />
            <Link href="/teach/glossary">{t("Glossary", "名詞解釋")}</Link>
            <span>
              {t(
                "Plain-language definitions of the terms in the lessons.",
                "課程中名詞的白話定義。",
              )}
            </span>
          </li>
          <li>
            <BookOpen size={18} />
            <Link href="/county">{t("County profiles", "縣市檔案")}</Link>
            <span>
              {t(
                "Compare the 22 counties and cities across every dataset.",
                "跨資料集比較 22 個縣市。",
              )}
            </span>
          </li>
          <li>
            <BookOpen size={18} />
            <Link href="/sources">{t("Source library", "來源庫")}</Link>
            <span>
              {t(
                "Agency, dates, licence and limits for each dataset.",
                "各資料集的機關、日期、授權與限制。",
              )}
            </span>
          </li>
        </ul>
      </section>
      <Footer />
    </main>
  );
}
