"use client";
import { useLanguage } from "./providers";
import { Reveal } from "./reveal";
import "./section-guide.css";

export interface GuideText {
  what: { en: string; zh: string };
  learn: { en: string[]; zh: string[] };
  limits: { en: string; zh: string };
}

/** A short orientation for anyone arriving cold: what the page shows, what it
 *  can teach, and what it cannot say. */
export function SectionGuide({ guide }: { guide: GuideText }) {
  const { language, t } = useLanguage();
  return (
    <Reveal as="section" className="section-guide">
      <div className="section-guide-col">
        <h2>{t("What this page shows", "這一頁呈現什麼")}</h2>
        <p>{guide.what[language]}</p>
      </div>
      <div className="section-guide-col">
        <h2>{t("What you can learn", "你可以從中認識")}</h2>
        <ul>
          {guide.learn[language].map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="section-guide-col" data-kind="limits">
        <h2>{t("What it cannot tell you", "它無法告訴你的事")}</h2>
        <p>{guide.limits[language]}</p>
      </div>
    </Reveal>
  );
}
