"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpDown, ArrowUpRight, FileText } from "lucide-react";
import type { CountyDetail, CountyRow } from "@/lib/county-rows";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { useLanguage } from "./providers";
import { speciesShortName } from "@/content/species-info";
import { Footer } from "./footer";
import { PinCountyButton } from "./pinned/pin-county";
import "./teach/teach.css";

const num = (value: number) => value.toLocaleString("en");

export function CountyProfile({
  county,
  all,
}: {
  county: CountyDetail;
  all: Pick<CountyRow, "code" | "en" | "zh">[];
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const name = language === "en" ? county.en : county.zh;
  const other = language === "en" ? county.zh : county.en;
  return (
    <main id="main" className="document-page teach county">
      <p className="teach-crumb">
        <Link href="/county">{t("County profiles", "縣市檔案")}</Link>
        <span aria-hidden="true"> / </span>
        {name}
      </p>
      <header className="teach-head" data-neutral="">
        <div className="teach-head-copy">
          <h1>{name}</h1>
          <p>
            {other} · {t("official county code", "官方縣市代碼")} {county.code}
          </p>
          <label className="county-jump">
            <span>{t("Go to another county", "前往其他縣市")}</span>
            <select
              value={county.code}
              onChange={(event) => router.push(`/county/${event.target.value}`)}
            >
              {all.map((item) => (
                <option key={item.code} value={item.code}>
                  {language === "en" ? item.en : item.zh}
                </option>
              ))}
            </select>
          </label>
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
      <p className="county-lede">
        {t(
          "What this atlas holds for the county, side by side. Each number comes with its limits: counts are not rates, and a county missing from a dataset has no data there, not zero.",
          "本平台在這個縣市的資料並列。每個數字都附有限制：數量不是比率；資料集中沒有該縣市，是沒有資料，而不是零。",
        )}
      </p>
      <PinCountyButton code={county.code} />
      <p className="county-sheet-link">
        <Link href={`/county/${county.code}/card`}>
          <FileText size={16} aria-hidden="true" />
          {t(
            "One-page report card to print or share",
            "一頁式報告卡，可列印或分享",
          )}
        </Link>
      </p>
      <ul className="county-tiles">
        <li data-tone="wildlife">
          <div className="county-card">
            <h2>{t("Wildlife records", "野生動物紀錄")}</h2>
            <p className="subject-tile-number">{num(county.wildlife)}</p>
            <p className="subject-tile-label">
              {county.wildlifeRank
                ? t(
                    `roadkill records, ${ordinal(county.wildlifeRank)} of ${county.of.wildlife} counties with records`,
                    `筆路死紀錄，在有紀錄的 ${county.of.wildlife} 個縣市中排第 ${county.wildlifeRank}`,
                  )
                : t(
                    "No records for this county in the published subset",
                    "公開子集中此縣市沒有紀錄",
                  )}
            </p>
            {county.species.length > 0 && (
              <ol className="county-list">
                {county.species.map((item) => (
                  <li key={item.id}>
                    <Link href={`/wildlife/species/${item.id}`}>
                      {speciesShortName(item.name, language)}
                    </Link>
                    <span>{num(item.count)}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="subject-tile-note">
              {t(
                "Counts reflect reporting effort, not animal numbers or risk.",
                "計數反映通報投入，並非動物數量或風險。",
              )}
            </p>
            <Link
              className="subject-tile-go"
              href={`/wildlife?county=${county.code}`}
            >
              {t("Open on the wildlife map", "在野生動物地圖開啟")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </li>
        <li data-tone="culture">
          <div className="county-card">
            <h2>{t("Listed villages", "列載部落")}</h2>
            <p className="subject-tile-number">{num(county.villages)}</p>
            <p className="subject-tile-label">
              {county.villagesRank
                ? t(
                    `village reference points, ${ordinal(county.villagesRank)} of ${county.of.villages} counties with listings`,
                    `個部落定位點，在有列載的 ${county.of.villages} 個縣市中排第 ${county.villagesRank}`,
                  )
                : t(
                    "No Indigenous village listings in this county",
                    "此縣市沒有原住民族部落列載",
                  )}
            </p>
            {county.groups.length > 0 && (
              <ol className="county-list">
                {county.groups.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <span>{num(item.count)}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="subject-tile-note">
              {t(
                "Dots are public reference points, not territories.",
                "定位點為公開定位點，並非傳統領域。",
              )}
            </p>
            <Link
              className="subject-tile-go"
              href={`/culture?county=${county.code}&shade=1`}
            >
              {t("Open on the culture map", "在文化地圖開啟")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </li>
        <li data-tone="forests">
          <div className="county-card">
            <h2>{t("Forest in 2023", "2023 年森林")}</h2>
            {county.forest && county.forestShare !== null ? (
              <>
                <p className="subject-tile-number">
                  {county.forestShare.toFixed(1)}%
                </p>
                <p className="subject-tile-label">
                  {t(
                    `of the mapped area is forest, ${ordinal(county.forestRank ?? 0)} of ${county.of.forest} counties with data`,
                    `的已繪製面積為森林，在有資料的 ${county.of.forest} 個縣市中排第 ${county.forestRank}`,
                  )}
                </p>
                <ol className="county-list">
                  <li>
                    <span>{t("Forest", "森林")}</span>
                    <span>{num(Math.round(county.forest.forestKm2))} km²</span>
                  </li>
                  <li>
                    <span>{t("Built-up land", "建成地")}</span>
                    <span>{num(Math.round(county.forest.builtUpKm2))} km²</span>
                  </li>
                  <li>
                    <span>{t("Agricultural land", "農業用地")}</span>
                    <span>
                      {num(Math.round(county.forest.agricultureKm2))} km²
                    </span>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="subject-tile-number">—</p>
                <p className="subject-tile-label">
                  {t(
                    "No mapped pixels in this release, so there is no statistic (blank, not zero).",
                    "本版沒有已繪製像素，因此沒有統計（空白，而非零）。",
                  )}
                </p>
              </>
            )}
            <p className="subject-tile-note">
              {t(
                "One year only: the atlas shows no change over time.",
                "僅單一年度：本平台不呈現時間上的變化。",
              )}
            </p>
            <Link
              className="subject-tile-go"
              href={`/forests?county=${county.code}&shade=1`}
            >
              {t("Open on the forest map", "在森林地圖開啟")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </li>
        <li data-tone="urban">
          <div className="county-card">
            <h2>{t("Urban green spaces", "都市綠地")}</h2>
            {county.urban ? (
              <>
                <p className="subject-tile-number">{num(county.urban.trees)}</p>
                <p className="subject-tile-label">
                  {t(
                    `surveyed park trees, plus ${num(county.urban.parks)} parks and ${num(county.urban.riverside)} riverside trees`,
                    `棵公園樹木調查紀錄，另有 ${num(county.urban.parks)} 座公園與 ${num(county.urban.riverside)} 筆河濱樹木`,
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="subject-tile-number">—</p>
                <p className="subject-tile-label">
                  {t(
                    "The urban inventories in this atlas cover Taipei City only.",
                    "本平台的都市清冊僅涵蓋臺北市。",
                  )}
                </p>
              </>
            )}
            <p className="subject-tile-note">
              {t(
                "Tree records are survey entries, not proof a tree is alive today.",
                "樹木紀錄為調查登錄，並不證明該樹目前存活。",
              )}
            </p>
            <Link className="subject-tile-go" href="/urban">
              {t("Open the urban map", "開啟都市地圖")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </li>
        <li data-tone="environment">
          <div className="county-card">
            <h2>{t("Air and water today", "今日空氣與水質")}</h2>
            <p className="subject-tile-number">{t("Live", "即時")}</p>
            <p className="subject-tile-label">
              {t(
                "Air-quality stations and monthly river samples report continuously, so there is no fixed number to print here.",
                "空品測站與每月河川採樣持續更新，因此這裡沒有固定數字可列。",
              )}
            </p>
            <Link
              className="subject-tile-go"
              href={`/environment?county=${county.code}&shade=1`}
            >
              {t("See this county's air quality", "查看此縣市的空氣品質")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </li>
      </ul>
      <Footer />
    </main>
  );
}

function ordinal(n: number) {
  const mod = n % 100;
  if (mod >= 11 && mod <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
}

type SortKey = "name" | "wildlife" | "villages" | "forest";

export function CountyIndex({ rows }: { rows: CountyRow[] }) {
  const { language, t } = useLanguage();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });
  const value = (row: CountyRow, key: SortKey) =>
    key === "name"
      ? language === "en"
        ? row.en
        : row.zh
      : key === "wildlife"
        ? row.wildlife
        : key === "villages"
          ? row.villages
          : (row.forestShare ?? -1);
  const sorted = [...rows].sort((a, b) => {
    const x = value(a, sort.key);
    const y = value(b, sort.key);
    const order =
      typeof x === "string" && typeof y === "string"
        ? x.localeCompare(y)
        : (x as number) - (y as number);
    return order * sort.dir;
  });
  const header = (key: SortKey, label: string) => (
    <th
      scope="col"
      aria-sort={
        sort.key === key
          ? sort.dir === 1
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() =>
          setSort((current) => ({
            key,
            dir:
              current.key === key
                ? ((current.dir * -1) as 1 | -1)
                : key === "name"
                  ? 1
                  : -1,
          }))
        }
      >
        {label}
        <ArrowUpDown size={13} />
      </button>
    </th>
  );
  return (
    <main id="main" className="document-page teach county">
      <header className="teach-head" data-neutral="">
        <div className="teach-head-copy">
          <h1>{t("County profiles", "縣市檔案")}</h1>
          <p>
            {t(
              "Compare Taiwan's 22 counties and cities across the datasets in the atlas. Click a heading to sort; open a county for its full profile.",
              "跨平台資料集比較臺灣 22 個縣市。點選欄名排序，開啟縣市可看完整檔案。",
            )}
          </p>
        </div>
        <span className="teach-stripe" aria-hidden="true" />
      </header>
      <div className="lesson-table county-table">
        <table>
          <caption>
            {t(
              "Records and statistics by county. A dash means no data in that dataset, not zero.",
              "各縣市紀錄與統計。破折號表示該資料集沒有資料，而非零。",
            )}
          </caption>
          <thead>
            <tr>
              {header("name", t("County", "縣市"))}
              {header("wildlife", t("Roadkill records", "路死紀錄"))}
              {header("villages", t("Listed villages", "列載部落"))}
              {header(
                "forest",
                t("Forest share, 2023 (%)", "2023 森林占比（%）"),
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.code}>
                <th scope="row">
                  <Link href={`/county/${row.code}`}>
                    {language === "en" ? row.en : row.zh}
                  </Link>
                </th>
                <td>{row.wildlife ? num(row.wildlife) : "—"}</td>
                <td>{row.villages ? num(row.villages) : "—"}</td>
                <td>
                  {row.forestShare === null ? "—" : row.forestShare.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="county-lede">
        {t(
          "Records are counts, not rates: counties differ in size, population and survey effort.",
          "紀錄是數量而非比率：各縣市面積、人口與調查投入不同。",
        )}
      </p>
      <Footer />
    </main>
  );
}
