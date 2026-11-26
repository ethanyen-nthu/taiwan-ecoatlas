"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { sectionTabs, type SectionKey } from "@/content/section-tabs";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { useLanguage } from "../providers";
import { Footer } from "../footer";
import { SectionTabs } from "../section-tabs";
import { CiteAndDownload } from "./cite-download";
import "../teach/teach.css";
import "./time-page.css";

export interface TimeFact {
  num: string;
  what: string;
  detail?: string;
}
export interface TimeNote {
  title: string;
  body: string;
}
export interface TimeLink {
  href: string;
  label: string;
}
export interface TimeSourceItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  used: string;
}
export interface TimeTable {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}

const sectionNames: Record<SectionKey, [string, string]> = {
  environment: ["Environment", "環境"],
  forests: ["Forests", "森林"],
  wildlife: ["Wildlife", "野生動物"],
  culture: ["Culture", "文化"],
  urban: ["City", "城市"],
  plants: ["Plants", "植物"],
};

/** One chart, with its caption and an exact-numbers table beneath it. */
export function TimePanel({
  id,
  title,
  sub,
  children,
  caption,
  table,
}: {
  id: string;
  title: string;
  sub?: string;
  children: ReactNode;
  caption?: ReactNode;
  table?: TimeTable;
}) {
  const { t } = useLanguage();
  return (
    <section className="tp-panel" aria-labelledby={id}>
      <div className="tp-panel-head">
        <h2 id={id}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children}
      {caption && <p className="tp-caption">{caption}</p>}
      {table && (
        <details className="tp-table">
          <summary>{t("See the numbers", "查看數字")}</summary>
          <table>
            <caption className="tp-sr">{table.caption}</caption>
            <thead>
              <tr>
                {table.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={String(row[0])}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th key={index} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={index}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

/** The shared layout of every "over time" page: a headline and three
 *  figures, the charts, how to read them, questions for class and sources. */
export function TimePage({
  section,
  tab,
  crumb,
  title,
  lede,
  facts,
  notes,
  questions,
  next,
  sourcesIntro,
  sources,
  live = false,
  children,
}: {
  section: SectionKey;
  tab: string;
  crumb: string;
  title: string;
  lede: string;
  facts: TimeFact[];
  notes: TimeNote[];
  questions: string[];
  next: TimeLink[];
  sourcesIntro: string;
  sources: TimeSourceItem[];
  /** True where the page shows the latest reading rather than a history. */
  live?: boolean;
  children: ReactNode;
}) {
  const { language, t } = useLanguage();
  const home = sectionTabs[section][0];
  return (
    <main
      id="main"
      className="document-page teach tp"
      data-subject={section}
      data-time-page={tab}
    >
      <p className="teach-crumb">
        <Link href={home.href}>
          {sectionNames[section][language === "en" ? 0 : 1]}
        </Link>
        <span aria-hidden="true"> / </span>
        {crumb}
      </p>
      <header className="teach-head">
        <div className="teach-head-copy">
          <h1>{title}</h1>
          <p>{lede}</p>
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
      <SectionTabs section={section} current={tab} />

      {facts.length > 0 && (
        <ul className="tp-facts">
          {facts.map((fact) => (
            <li key={fact.what}>
              <p
                className="tp-num"
                data-long={fact.num.length > 11 ? "true" : undefined}
              >
                {fact.num}
              </p>
              <p className="tp-what">{fact.what}</p>
              {fact.detail && <p className="tp-detail">{fact.detail}</p>}
            </li>
          ))}
        </ul>
      )}

      {children}

      <section className="tp-section" aria-labelledby="tp-read">
        <h2 id="tp-read">{t("How to read it", "如何解讀")}</h2>
        <ol className="tp-notes">
          {notes.map((note) => (
            <li key={note.title}>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="tp-class" aria-labelledby="tp-class-title">
        <h2 id="tp-class-title">{t("Questions for class", "課堂討論題")}</h2>
        <ol>
          {questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
        <p className="tp-next">
          {next.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </p>
      </section>

      <section
        className="tp-section tp-sources"
        aria-labelledby="tp-sources-title"
      >
        <h2 id="tp-sources-title">{t("Sources", "資料來源")}</h2>
        <p>{sourcesIntro}</p>
        <ul>
          {sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title}
              </a>
              <span>
                {source.publisher} · {source.used}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <CiteAndDownload title={title} sources={sources} live={live} />
      <Footer />
    </main>
  );
}
