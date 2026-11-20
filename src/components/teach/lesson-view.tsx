"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock,
  GraduationCap,
  Printer,
} from "lucide-react";
import type { Lesson } from "@/content/lessons";
import { lessonMeta, trackLabel, type L } from "@/content/lesson-index";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { siteUrl } from "@/lib/site";
import { useLanguage } from "../providers";
import { Footer } from "../footer";
import { CopyButton } from "../copy-button";
import "./teach.css";

const subjectName = {
  environment: { en: "Environment", zh: "環境" },
  forests: { en: "Forests", zh: "森林" },
  wildlife: { en: "Wildlife", zh: "野生動物" },
  culture: { en: "Culture", zh: "文化" },
  urban: { en: "City", zh: "城市" },
} as const;

export function LessonView({ lesson }: { lesson: Lesson }) {
  const { language, t } = useLanguage();
  const [student, setStudent] = useState(false);
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  const title = tl(lesson.title);
  const url = `${siteUrl}/teach/${lesson.slug}`;
  const sourceNames = lesson.sources.map((source) => source.label).join("; ");
  const citation =
    language === "en"
      ? `Taiwan EcoAtlas. (2026). ${lesson.title.en}. ${url}. Underlying data and references: ${sourceNames}. Accessed [date].`
      : `Taiwan EcoAtlas（臺灣環境與文化地圖）。（2026）。${lesson.title.zh}。${url}。資料與參考文獻：${sourceNames}。檢索日期：[日期]。`;
  const next =
    lessonMeta[
      (lessonMeta.findIndex((item) => item.slug === lesson.slug) + 1) %
        lessonMeta.length
    ];
  const sections: [string, string, string, boolean][] = [
    ["objectives", "Objectives", "學習目標", false],
    ["prepare", "Before class", "課前準備", true],
    ["background", "Background", "背景", false],
    ["activity", "Activity", "活動", false],
    ["notice", "What the data shows", "資料呈現什麼", true],
    ["questions", "Discussion questions", "討論題", false],
    ["pitfalls", "Watch out for", "留意事項", true],
    ["assess", "Assessment idea", "評量構想", false],
    ["sources", "Sources", "來源", false],
    ["cite", "How to cite", "如何引用", false],
  ];
  return (
    <main
      id="main"
      className="document-page teach lesson"
      data-subject={lesson.subject}
      data-view={student ? "student" : "full"}
    >
      <p className="teach-crumb">
        <Link href="/teach">{t("Teach", "教學")}</Link>
        <span aria-hidden="true"> / </span>
        {title}
      </p>
      <header className="teach-head">
        <div className="teach-head-copy">
          <h1>{title}</h1>
          <p>{tl(lesson.summary)}</p>
          <ul
            className="teach-meta"
            aria-label={t("About this lesson", "關於本課")}
          >
            <li>
              <Clock size={15} />
              {language === "en"
                ? `${lesson.minutes} minutes`
                : `${lesson.minutes} 分鐘`}
            </li>
            <li>
              <GraduationCap size={15} />
              {tl(lesson.level)}
            </li>
            <li>{tl(trackLabel[lesson.track])}</li>
            <li>{tl(subjectName[lesson.subject])}</li>
          </ul>
        </div>
        <div className="teach-actions">
          <button
            type="button"
            aria-pressed={student}
            onClick={() => setStudent((value) => !value)}
          >
            {student && <Check size={15} aria-hidden="true" />}
            {t("Student handout view", "學生講義檢視")}
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} />
            {t("Print or save as PDF", "列印或存成 PDF")}
          </button>
        </div>
        <svg
          className="teach-island"
          viewBox={islandViewBox}
          aria-hidden="true"
          focusable="false"
        >
          <path d={islandPath} />
        </svg>
      </header>
      <p className="print-only teach-print-note">
        {t(
          `Map links in this handout begin with ${siteUrl}`,
          `本講義中的地圖連結開頭為 ${siteUrl}`,
        )}
      </p>
      <div className="lesson-grid">
        <nav className="lesson-toc" aria-label={t("On this page", "本頁內容")}>
          <ol>
            {sections
              .filter(([id]) => id !== "notice" || lesson.notice.length > 0)
              .map(([id, en, zh, instructor]) => (
                <li
                  key={id}
                  className={instructor ? "instructor-only" : undefined}
                >
                  <a href={`#${id}`}>{t(en, zh)}</a>
                </li>
              ))}
          </ol>
        </nav>
        <article className="lesson-body">
          <section id="objectives">
            <h2>{t("Objectives", "學習目標")}</h2>
            <p>
              {t("After this lesson, students can:", "完成本課後，學生能夠：")}
            </p>
            <ul>
              {lesson.objectives.map((item) => (
                <li key={item.en}>{tl(item)}</li>
              ))}
            </ul>
          </section>
          <section id="prepare" className="instructor-only">
            <h2>{t("Before class", "課前準備")}</h2>
            <ul>
              {lesson.prepare.map((item) => (
                <li key={item.en}>{tl(item)}</li>
              ))}
            </ul>
          </section>
          <section id="background">
            <h2>{t("Background", "背景")}</h2>
            {lesson.background.map((item) => (
              <p key={item.en}>{tl(item)}</p>
            ))}
            {lesson.table && (
              <div className="lesson-table">
                <table>
                  <caption>{tl(lesson.table.caption)}</caption>
                  <thead>
                    <tr>
                      {lesson.table.head.map((cell) => (
                        <th key={cell.en} scope="col">
                          {tl(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.table.rows.map((row) => (
                      <tr key={row[0].en}>
                        {row.map((cell, index) =>
                          index === 0 ? (
                            <th key={index} scope="row">
                              {tl(cell)}
                            </th>
                          ) : (
                            <td
                              key={index}
                              className={cell.en ? undefined : "fill"}
                            >
                              {tl(cell)}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section id="activity">
            <h2>{t("Activity", "活動")}</h2>
            <ol className="lesson-steps">
              {lesson.steps.map((step) => (
                <li key={step.title.en}>
                  <h3>{tl(step.title)}</h3>
                  <p>{tl(step.body)}</p>
                  {step.href && (
                    <Link className="lesson-open" href={step.href}>
                      {step.hrefLabel ? tl(step.hrefLabel) : t("Open", "開啟")}
                      <ArrowUpRight size={15} />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>
          {lesson.notice.length > 0 && (
            <section id="notice" className="instructor-only">
              <h2>{t("What the data shows", "資料呈現什麼")}</h2>
              <p className="lesson-note">
                {t(
                  "Counted from the published data files when the site was built, so these match what students will see.",
                  "於網站建置時由公開資料檔計算，與學生看到的相符。",
                )}
              </p>
              <ul>
                {lesson.notice.map((item) => (
                  <li key={item.en}>{tl(item)}</li>
                ))}
              </ul>
            </section>
          )}
          <section id="questions">
            <h2>{t("Discussion questions", "討論題")}</h2>
            <ol>
              {lesson.questions.map((item) => (
                <li key={item.en}>{tl(item)}</li>
              ))}
            </ol>
          </section>
          <section id="pitfalls" className="instructor-only">
            <h2>{t("Watch out for", "留意事項")}</h2>
            <ul>
              {lesson.pitfalls.map((item) => (
                <li key={item.en}>{tl(item)}</li>
              ))}
            </ul>
          </section>
          <section id="assess">
            <h2>{t("Assessment idea", "評量構想")}</h2>
            <p>{tl(lesson.assess)}</p>
          </section>
          <section id="sources">
            <h2>{t("Sources", "來源")}</h2>
            <ul>
              {lesson.sources.map((source) => (
                <li key={source.url}>
                  {source.url.startsWith("/") ? (
                    <Link href={source.url}>{source.label}</Link>
                  ) : (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                      <ArrowUpRight size={13} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <p className="lesson-note">
              {t(
                "Every dataset used here also lists its own agency, dates, licence and limits under “About this data” on its map page.",
                "本課使用的每個資料集，也在其地圖頁的「關於此資料」列出機關、日期、授權與限制。",
              )}
            </p>
          </section>
          <section id="cite">
            <h2>{t("How to cite", "如何引用")}</h2>
            <p className="lesson-cite">{citation}</p>
            <CopyButton
              text={citation}
              label={t("Copy citation", "複製引用")}
              done={t("Citation copied", "已複製引用")}
            />
            <p className="lesson-note">
              {t(
                `Last reviewed ${lesson.reviewed}. Replace [date] with the day you opened the page, and cite the original data sources too.`,
                `最後檢閱：${lesson.reviewed}。請將 [日期] 換成你開啟頁面的日期，並一併引用原始資料來源。`,
              )}
            </p>
          </section>
          <p className="lesson-next">
            {t("Next lesson", "下一課")}:{" "}
            <Link href={`/teach/${next.slug}`}>{tl(next.title)}</Link>
          </p>
        </article>
      </div>
      <Footer />
    </main>
  );
}
