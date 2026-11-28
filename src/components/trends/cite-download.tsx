"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { composeChart } from "@/lib/chart-export";
import { siteUrl } from "@/lib/site";
import { cleanCell, pathSlug, toCsv } from "@/lib/table-csv";
import { useLanguage } from "../providers";
import { CopyButton } from "../copy-button";
import { captionOf, findCharts, readChart, toPng } from "./chart-picture";

interface FoundTable {
  caption: string;
  rows: number;
}
interface FoundChart {
  caption: string;
}
interface ReadTable {
  head: string[];
  rows: string[][];
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The text of one cell. A cell can state its own file value with data-csv;
 *  hidden screen-reader text and decoration never reach the file. */
function cellText(cell: Element): string {
  const own = cell.getAttribute("data-csv");
  if (own !== null) return cleanCell(own);
  const copy = cell.cloneNode(true) as Element;
  copy
    .querySelectorAll(".tp-sr, [data-csv-skip], [data-csv-extra]")
    .forEach((node) => node.remove());
  return cleanCell(copy.textContent ?? "");
}

/** Reads a table as the header row and the body rows. An element marked
 *  data-csv-extra="Name" inside a row becomes an extra column on the right
 *  (the reservoir number, shown small under the name on the page). */
function readTable(table: HTMLTableElement): ReadTable {
  const all = Array.from(table.rows);
  const headRow = table.tHead?.rows[0] ?? all[0];
  const bodyRows =
    table.tBodies.length > 0
      ? Array.from(table.tBodies).flatMap((body) => Array.from(body.rows))
      : all.slice(1);
  const head = headRow ? Array.from(headRow.cells).map(cellText) : [];
  const extraNames: string[] = [];
  const rows = bodyRows.map((row) => {
    const values = Array.from(row.cells).map(cellText);
    const extras = new Map<string, string>();
    row.querySelectorAll("[data-csv-extra]").forEach((node) => {
      const name = node.getAttribute("data-csv-extra") ?? "";
      if (!extraNames.includes(name)) extraNames.push(name);
      extras.set(
        name,
        cleanCell(node.getAttribute("data-csv") ?? node.textContent ?? ""),
      );
    });
    return { values, extras };
  });
  return {
    head: [...head, ...extraNames],
    rows: rows.map(({ values, extras }) => [
      ...values,
      ...extraNames.map((name) => extras.get(name) ?? ""),
    ]),
  };
}

function findTables(): HTMLTableElement[] {
  return Array.from(document.querySelectorAll<HTMLTableElement>("main table"))
    .filter((table) => !table.closest("[data-cite]"))
    .filter((table) => table.rows.length > 1);
}

function describeTable(table: HTMLTableElement, index: number): FoundTable {
  const caption =
    table.caption?.textContent?.trim() ||
    table.closest("section")?.querySelector("h2")?.textContent?.trim() ||
    `Table ${index + 1}`;
  return { caption, rows: readTable(table).rows.length };
}

/** "2026-11-26 15:20" in Taiwan time. Empty on the server, so the page that
 *  was built ahead of time never shows a date it cannot know. */
function taipeiStamp(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}
const noSubscription = () => () => {};

/** Hands a made file to the browser's download. */
function save(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

/** A title followed by its full stop, without doubling one it already has
 *  ("How full are the reservoirs?" stays as it is). */
const sentence = (text: string, stop: string) =>
  /[.?!。？！]$/.test(text) ? text : `${text}${stop}`;

export function CiteAndDownload({
  title,
  sources,
  live = false,
}: {
  title: string;
  sources: { title: string; publisher: string }[];
  /** True on pages that show the latest reading, where the time matters. */
  live?: boolean;
}) {
  const { language, t } = useLanguage();
  const pathname = usePathname();
  const stamp = useSyncExternalStore(noSubscription, taipeiStamp, () => "");
  const [tables, setTables] = useState<FoundTable[]>([]);
  const [charts, setCharts] = useState<FoundChart[]>([]);
  const [chartError, setChartError] = useState(false);
  const [withSource, setWithSource] = useState(true);

  // Tables arrive after data loads on the live pages, so watch for them.
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    let signature = "";
    let timer = 0;
    const scan = () => {
      timer = 0;
      const found = findTables().map(describeTable);
      const pictures = findCharts().map((root, index) => ({
        caption: captionOf(root, `Chart ${index + 1}`),
      }));
      const next = [
        ...found.map((f) => `${f.caption}|${f.rows}`),
        ...pictures.map((c) => `chart|${c.caption}`),
      ].join("\n");
      if (next === signature) return;
      signature = next;
      setTables(found);
      setCharts(pictures);
    };
    // A short timer, not an animation frame: frames do not run in a page
    // that is in a background tab or not on screen yet.
    const queue = () => {
      if (!timer) timer = window.setTimeout(scan, 60);
    };
    queue();
    const observer = new MutationObserver(queue);
    observer.observe(main, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname]);

  const url = `${siteUrl}${pathname}`;
  const year = stamp ? stamp.slice(0, 4) : null;
  const [datePart = "", timePart = ""] = stamp.split(" ");
  const [y = "", m = "", d = ""] = datePart.split("-");
  const day =
    language === "en"
      ? `${Number(d)} ${months[Number(m) - 1] ?? ""} ${y}`
      : `${y}年${Number(m)}月${Number(d)}日`;
  const accessed = !stamp
    ? t("[date]", "[日期]")
    : live
      ? language === "en"
        ? `${day}, ${timePart} (Taiwan time)`
        : `${day} ${timePart}（臺灣時間）`
      : day;
  const publishers = Array.from(
    new Set(sources.map((source) => source.publisher)),
  ).join("; ");
  const citation =
    language === "en"
      ? `Taiwan EcoAtlas. (${year ?? "n.d."}). ${sentence(title, ".")} ${url}. Underlying data: ${publishers}. Accessed ${accessed}.`
      : `Taiwan EcoAtlas（臺灣環境與文化地圖）。（${year ?? "年份"}）。${sentence(title, "。")}${url}。資料來源：${publishers}。檢索日期：${accessed}。`;

  const download = (index: number) => {
    const table = findTables()[index];
    if (!table) return;
    const { head, rows } = readTable(table);
    const provenance: [string, string][] = withSource
      ? [
          [t("Source", "來源"), `Taiwan EcoAtlas, ${title}`],
          [t("Page", "網頁"), url],
          [t("Underlying data", "資料來源"), publishers],
          [t("Accessed", "檢索日期"), accessed],
        ]
      : [];
    save(
      new Blob([toCsv(head, rows, provenance)], {
        type: "text/csv;charset=utf-8",
      }),
      `taiwan-ecoatlas-${pathSlug(pathname)}-${index + 1}.csv`,
    );
  };

  /** A chart as it is drawn now, with its legend and a source line at the
   *  bottom (unless the visitor turned the source lines off). */
  const exportChart = async (index: number, format: "png" | "svg") => {
    const read = readChart(findCharts()[index]);
    if (!read) return;
    setChartError(false);
    const sourceLines = withSource
      ? [
          `${t("Source", "來源")}: Taiwan EcoAtlas, ${sentence(title, ".")} ${url}`,
          `${t("Underlying data", "資料來源")}: ${publishers}. ${t("Accessed", "檢索日期")} ${accessed}.`,
        ]
      : [];
    sourceLines.push("Taiwan EcoAtlas 臺灣環境與文化地圖");
    const { svg, width, height } = composeChart(read.picture, {
      title: read.caption,
      legend: read.legend,
      sourceLines,
      fontFamily: read.fontFamily,
    });
    const name = `taiwan-ecoatlas-${pathSlug(pathname)}-chart-${index + 1}`;
    try {
      if (format === "svg")
        save(
          new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
          `${name}.svg`,
        );
      else save(await toPng(svg, width, height), `${name}.png`);
    } catch {
      setChartError(true);
    }
  };

  return (
    <section
      className="tp-section tp-cite"
      data-cite
      aria-labelledby="tp-cite-title"
    >
      <h2 id="tp-cite-title">
        {t("Cite this page and take the numbers", "引用本頁，取得數字")}
      </h2>
      <p className="tp-cite-text">{citation}</p>
      <div className="tp-cite-actions">
        <CopyButton
          text={citation}
          label={t("Copy citation", "複製引用")}
          done={t("Citation copied", "已複製引用")}
        />
        <button
          type="button"
          className="teach-copy"
          onClick={() => window.print()}
        >
          <Printer size={15} aria-hidden="true" />
          {t("Print or save as PDF", "列印或存成 PDF")}
        </button>
      </div>
      <p className="tp-cite-note">
        {live
          ? t(
              "These are live readings and they change, so the time you opened the page is part of the citation. Cite the original agencies listed above as well.",
              "這些是即時讀數，會隨時間改變，所以開啟頁面的時間是引用的一部分。請一併引用上方列出的原始機關。",
            )
          : t(
              "Cite the original agencies listed above as well; this page only arranges and explains their figures.",
              "請一併引用上方列出的原始機關；本頁只是整理並說明它們的數字。",
            )}
      </p>

      {(tables.length > 0 || charts.length > 0) && (
        <label className="tp-cite-check">
          <input
            type="checkbox"
            checked={withSource}
            onChange={(event) => setWithSource(event.target.checked)}
          />
          {t(
            "Add source lines at the bottom of each file",
            "在每個檔案底部加上來源說明",
          )}
        </label>
      )}

      {tables.length > 0 && (
        <div className="tp-cite-files">
          <h3>{t("The tables on this page, as CSV", "本頁的表格，CSV 檔")}</h3>
          <p className="tp-cite-note">
            {t(
              "Numbers are written as they appear on the page, rounded the same way. A blank cell means the source gave no figure; it is never written as zero.",
              "數字與頁面上顯示的相同，四捨五入的方式也一樣。空白儲存格表示來源沒有提供數字，不會寫成零。",
            )}
          </p>
          <ul>
            {tables.map((table, index) => (
              <li key={`${index}-${table.caption}`}>
                <span className="tp-cite-name">
                  {table.caption}
                  <small>{t(`${table.rows} rows`, `${table.rows} 列`)}</small>
                </span>
                <button
                  type="button"
                  className="teach-copy"
                  aria-label={`${t("Download CSV", "下載 CSV")}: ${table.caption}`}
                  onClick={() => download(index)}
                >
                  <Download size={15} aria-hidden="true" />
                  {t("Download CSV", "下載 CSV")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {charts.length > 0 && (
        <div className="tp-cite-files" data-cite-charts>
          <h3>
            {t("The charts on this page, as pictures", "本頁的圖表，圖片檔")}
          </h3>
          <p className="tp-cite-note">
            {t(
              "Each picture is the chart as drawn now, with its title, its key and a line of source at the bottom, ready for a slide or a handout. PNG is for slides and documents; SVG stays sharp at any size.",
              "每張圖片都是目前畫出的圖表，附上標題、圖例與底部的來源說明，可直接放進投影片或講義。PNG 適合投影片與文件；SVG 放大也不會模糊。",
            )}
          </p>
          <ul>
            {charts.map((chart, index) => (
              <li key={`${index}-${chart.caption}`}>
                <span className="tp-cite-name">{chart.caption}</span>
                <span className="tp-cite-buttons">
                  {(["png", "svg"] as const).map((format) => (
                    <button
                      key={format}
                      type="button"
                      className="teach-copy"
                      aria-label={`${t("Download", "下載")} ${format.toUpperCase()}: ${chart.caption}`}
                      onClick={() => void exportChart(index, format)}
                    >
                      <Download size={15} aria-hidden="true" />
                      {format.toUpperCase()}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          {chartError && (
            <p className="tp-cite-note" role="alert">
              {t(
                "This browser could not make the picture. Try the SVG, or print the page.",
                "這個瀏覽器無法產生圖片。請改用 SVG，或列印本頁。",
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
