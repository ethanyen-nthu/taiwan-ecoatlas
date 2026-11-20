"use client";
import { ArrowUpRight } from "lucide-react";
import { cityPortals } from "@/content/section-guides";
import { useLanguage } from "./providers";
import "./city-coverage.css";

/** Explains, on the city page itself, why parks and trees are Taipei only.
 *  The one-line answer is always visible; the reasons open underneath. */
export function CityCoverage() {
  const { t, language } = useLanguage();
  return (
    <details className="city-coverage" id="coverage">
      <summary>
        <h2>{t("Why only Taipei?", "為什麼只有臺北？")}</h2>
        <span>
          {t(
            "Taipei is the only city whose park and tree lists have been checked and imported so far.",
            "目前只有臺北的公園與樹木名錄經過查核並匯入。",
          )}
        </span>
        <b aria-hidden="true">{t("Read why", "了解原因")}</b>
      </summary>
      <div className="city-coverage-body">
        <div>
          <p>
            {t(
              "Taiwan has no single national list of parks or trees. Each city publishes its own, in its own format, with its own survey dates and licence, so what appears here depends on which lists have been checked and imported.",
              "臺灣沒有全國統一的公園或樹木名錄。各縣市各自公布，格式、調查年份與授權都不同，所以這裡呈現的內容取決於哪些名錄已經查核並匯入。",
            )}
          </p>
          <p>
            {t(
              "So far that is three Taipei inventories: parks, park trees and a one-off riverside tree survey. Air temperature is the exception, because the weather stations cover the whole island and every city is already in that layer.",
              "目前匯入的是臺北的三份清冊：公園、公園樹木與一次性的河濱樹木調查。氣溫是例外，因為氣象測站涵蓋全島，每個城市都已包含在該圖層裡。",
            )}
          </p>
          <p>
            {t(
              "Other cities are not shown yet rather than shown unchecked. Adding one means reading its licence, confirming what its dates and boundaries cover, and matching its tree names.",
              "其他城市尚未顯示，而不是顯示未經查核的資料。加入一個城市需要確認授權、調查日期與範圍，並對照樹種名稱。",
            )}
          </p>
        </div>
        <div>
          <h3>{t("Where to look for other cities", "其他城市的資料去哪找")}</h3>
          <ul>
            {cityPortals.map((portal) => (
              <li key={portal.url}>
                <a href={portal.url} target="_blank" rel="noreferrer">
                  {portal.name[language]}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <span>{portal.url.replace("https://", "")}</span>
              </li>
            ))}
          </ul>
          <p className="city-coverage-note">
            {t(
              "These are the cities’ own open-data portals. We have not imported anything from them yet.",
              "以上是各市政府的開放資料平臺，我們尚未從中匯入任何資料。",
            )}
          </p>
        </div>
      </div>
    </details>
  );
}
