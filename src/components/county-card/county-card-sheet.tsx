"use client";
import Link from "next/link";
import { Printer } from "lucide-react";
import { cardRows, type CountyCardData } from "@/lib/county-card";
import type { Silhouette } from "@/lib/silhouette";
import { siteUrl } from "@/lib/site";
import { CopyButton } from "../copy-button";
import { useLanguage } from "../providers";
import "./county-card.css";

/** One county on one sheet of paper: the six findings of the tour, each with
 *  its figure, what it measures, what it cannot tell you and where it came
 *  from. The figures are the tour's own, read for this county. */
export function CountyCardSheet({
  data,
  shape,
}: {
  data: CountyCardData;
  shape: Silhouette | null;
}) {
  const { language, t } = useLanguage();
  const rows = cardRows(data, language);
  const name = language === "en" ? data.en : data.zh;
  const other = language === "en" ? data.zh : data.en;
  const address = `${siteUrl}/county/${data.code}`;
  return (
    <main id="main" className="document-page county-sheet-page">
      <p className="county-sheet-crumb">
        <Link href={`/county/${data.code}`}>
          {t("Back to the county profile", "回到縣市檔案")}
        </Link>
      </p>
      <div className="county-sheet-actions">
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          {t("Print or save as PDF", "列印或存成 PDF")}
        </button>
        <CopyButton
          className="county-sheet-copy"
          text={address}
          label={t("Copy link to share", "複製分享連結")}
          done={t("Link copied", "已複製連結")}
        />
        <p>
          {t(
            "Pasting the link into LINE shows this county’s four main figures as a picture.",
            "把連結貼到 LINE，會以圖片顯示這個縣市的四項主要數字。",
          )}
        </p>
      </div>
      <article
        className="county-sheet"
        aria-label={t("Report card", "縣市報告卡")}
      >
        <header className="county-sheet-head">
          <div>
            <p className="county-sheet-brand">
              Taiwan EcoAtlas <span lang="zh-Hant">臺灣環境與文化地圖</span>
            </p>
            <h1>{name}</h1>
            <p
              className="county-sheet-other"
              lang={language === "en" ? "zh-Hant" : "en"}
            >
              {other}
            </p>
            <p className="county-sheet-note">
              {t(
                "Six findings for this county, each with its limits. A dash means the atlas has no figure here, which is not the same as zero.",
                "這個縣市的六項發現，每項都附有限制。破折號表示本平台在此沒有數字，並不等於零。",
              )}
            </p>
          </div>
          {shape && (
            <svg
              className="county-sheet-shape"
              width={shape.width}
              height={shape.height}
              viewBox={`0 0 ${shape.width} ${shape.height}`}
              aria-hidden="true"
              focusable="false"
            >
              <path d={shape.d} />
            </svg>
          )}
        </header>
        <ol className="county-sheet-rows">
          {rows.map((row) => (
            <li key={row.id} data-tone={row.tone} data-gap={row.value === null}>
              <div className="county-sheet-label">
                <h2>{row.subject}</h2>
                <p>{row.heading}</p>
              </div>
              <div className="county-sheet-figure">
                {row.value === null ? (
                  <p className="county-sheet-gap">
                    <span aria-hidden="true">—</span>
                    <span className="county-sheet-gap-why">{row.gap}</span>
                  </p>
                ) : (
                  <p className="county-sheet-value">{row.value}</p>
                )}
                {row.place && <p className="county-sheet-place">{row.place}</p>}
              </div>
              <dl className="county-sheet-words">
                <div>
                  <dt>{t("What it is", "是什麼")}</dt>
                  <dd>{row.what}</dd>
                </div>
                <div>
                  <dt>{t("Cannot tell you", "無法說明")}</dt>
                  <dd>{row.cannot}</dd>
                </div>
                <div>
                  <dt>{t("Source", "來源")}</dt>
                  <dd>{row.source}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        <footer className="county-sheet-foot">
          <p>
            {t(
              "Figures are as published in the atlas; the full source list and licences are at",
              "數字與平台上公布的一致；完整來源與授權見",
            )}{" "}
            {siteUrl.replace("https://", "")}/sources
          </p>
          <p>{address.replace("https://", "")}</p>
        </footer>
      </article>
    </main>
  );
}
