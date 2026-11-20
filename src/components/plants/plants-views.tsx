"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { PlantRow } from "@/server/plants";
import { habitLabels, originLabels, type PlantHabit } from "@/content/plants";
import { findPlant } from "@/content/plants";
import { useLanguage } from "../providers";
import { Footer } from "../footer";
import { Reveal } from "../reveal";
import { SectionGuide, type GuideText } from "../section-guide";
import { PhotoThumb } from "../photo-thumb";
import { WikiGallery } from "../wiki-gallery";
import "./plants.css";

const habits: PlantHabit[] = ["evergreen", "deciduous", "palm", "conifer"];
export const plantsGuide: GuideText = {
  what: {
    en: "Every kind of tree in two Taipei inventories: the public-park survey and a one-off riverside survey. Each kind has a page with a photo, a short description, where it comes from and where it grows.",
    zh: "整理臺北市兩份樹木清冊（公園樹木盤點與一次性的河濱喬木調查）裡的每一種樹。每種樹都有專頁，包含照片、簡介、原生或外來，以及它長在哪裡。",
  },
  learn: {
    en: [
      "Which trees make up a city’s shade, and how many of them are native.",
      "The difference between evergreen, deciduous, palm and conifer trees, seen in real numbers.",
      "How big trees of each kind get in a park.",
    ],
    zh: [
      "城市的樹蔭由哪些樹組成，其中有多少是臺灣原生種。",
      "常綠、落葉、棕櫚與針葉樹的差別，用實際數量來看。",
      "每種樹在公園裡通常長到多大。",
    ],
  },
  limits: {
    en: "Taipei only, and only public parks and a few riverside parks, not street trees or private gardens. A record shows a tree was surveyed, not that it is alive today. Heights and trunk sizes are as reported and a few are obvious entry errors.",
    zh: "只涵蓋臺北市，且僅限公園與部分河濱公園，不含行道樹與私人庭院。紀錄只代表樹曾被調查，不代表現在仍然存活；樹高與胸徑為來源所載，其中少數明顯是登錄錯誤。",
  },
};

function Bars({
  rows,
}: {
  rows: { key: string; label: string; count: number; note?: string }[];
}) {
  const { language } = useLanguage();
  const max = Math.max(1, ...rows.map((row) => row.count));
  const format = (n: number) =>
    n.toLocaleString(language === "zh" ? "zh-TW" : "en-US");
  return (
    <ul className="plants-bars">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="plants-bar-label">
            {row.label}
            {row.note && <small>{row.note}</small>}
          </span>
          <span className="plants-bar-track" aria-hidden="true">
            <span style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <b>{format(row.count)}</b>
        </li>
      ))}
    </ul>
  );
}

const habitShort: Record<PlantHabit, { en: string; zh: string }> = {
  evergreen: { en: "Evergreen", zh: "常綠" },
  deciduous: { en: "Deciduous", zh: "落葉" },
  palm: { en: "Palm", zh: "棕櫚" },
  conifer: { en: "Conifer", zh: "針葉" },
};

function HabitTag({
  habit,
  short = false,
}: {
  habit: PlantHabit;
  short?: boolean;
}) {
  const { language } = useLanguage();
  return (
    <span className="plants-habit" data-habit={habit}>
      {(short ? habitShort : habitLabels)[habit][language]}
    </span>
  );
}

export function PlantsGuide({
  rows,
  totalTrees,
}: {
  rows: PlantRow[];
  totalTrees: number;
}) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [habit, setHabit] = useState<PlantHabit | "all">("all");
  const [origin, setOrigin] = useState<"all" | "native" | "introduced">("all");
  const [sort, setSort] = useState<"count" | "height" | "name">("count");
  const [shown, setShown] = useState(48);
  const format = (n: number) =>
    n.toLocaleString(language === "zh" ? "zh-TW" : "en-US");

  const guided = rows.filter((row) => row.guided);
  const guidedTrees = guided.reduce((sum, row) => sum + row.count, 0);
  const byHabit = habits.map((key) => ({
    key,
    label: habitLabels[key][language],
    note: habitLabels[key].hint[language],
    count: guided
      .filter((row) => row.habit === key)
      .reduce((sum, row) => sum + row.count, 0),
  }));
  const knownOrigin = guided.filter((row) => row.origin);
  const byOrigin = (["native", "introduced"] as const).map((key) => ({
    key,
    label: originLabels[key][language],
    count: knownOrigin
      .filter((row) => row.origin === key)
      .reduce((sum, row) => sum + row.count, 0),
  }));
  const byFamily = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const row of guided) {
      if (!row.family) continue;
      const entry = map.get(row.family) || {
        label: language === "zh" ? `${row.familyZh}` : `${row.family}`,
        count: 0,
      };
      entry.count += row.count;
      map.set(row.family, entry);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([key, value]) => ({ key, ...value }));
  }, [guided, language]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const list = rows.filter(
      (row) =>
        (habit === "all" || row.habit === habit) &&
        (origin === "all" || row.origin === origin) &&
        (!text ||
          [row.name, row.en, row.sci, row.familyZh, row.family]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(text))),
    );
    return [...list].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "zh-Hant")
        : sort === "height"
          ? (b.medianHeightM ?? 0) - (a.medianHeightM ?? 0) || b.count - a.count
          : b.count - a.count,
    );
  }, [rows, query, habit, origin, sort]);
  const percent = Math.round((guidedTrees / totalTrees) * 100);

  return (
    <main id="main" data-subject="plants" className="plants-page">
      <header className="plants-hero">
        <h1>
          {t(
            "The trees of Taipei, and the kinds they come in",
            "臺北的樹，與它們的種類",
          )}
        </h1>
        <p>
          {t(
            "A guide to the trees surveyed in the city’s parks and along its rivers: what each one is, where it comes from, and where to find it.",
            "整理臺北市公園與河濱調查到的樹木：每一種是什麼、從哪裡來、在哪裡看得到。",
          )}
        </p>
        <dl className="plants-numbers">
          <div>
            <dt>{t("trees surveyed", "調查的樹木")}</dt>
            <dd>{format(totalTrees)}</dd>
          </div>
          <div>
            <dt>{t("kinds of tree", "種樹")}</dt>
            <dd>{format(rows.length)}</dd>
          </div>
          <div>
            <dt>{t("with a guide entry", "有導覽介紹")}</dt>
            <dd>{format(guided.length)}</dd>
          </div>
        </dl>
      </header>

      <SectionGuide guide={plantsGuide} />

      <Reveal as="section" className="plants-kinds">
        <div className="plants-kinds-head">
          <h2>{t("The kinds at a glance", "種類一覽")}</h2>
          <p>
            {t(
              `Counts are trees. The ${format(guided.length)} species with a guide entry make up ${percent}% of the trees; the rest are listed with their numbers only.`,
              `數字為樹木棵數。有導覽介紹的 ${format(guided.length)} 種樹占全部樹木的 ${percent}%，其餘僅列出數量。`,
            )}
          </p>
        </div>
        <div className="plants-kinds-grid">
          <section aria-labelledby="by-habit">
            <h3 id="by-habit">{t("By way of growing", "依生長型態")}</h3>
            <Bars rows={byHabit} />
          </section>
          <section aria-labelledby="by-origin">
            <h3 id="by-origin">{t("Native or introduced", "原生或外來")}</h3>
            <Bars rows={byOrigin} />
            <p className="plants-aside">
              {t(
                "Species that are naturalised or whose origin is disputed are left out of this bar.",
                "已歸化或來源有爭議的樹種不列入此圖。",
              )}
            </p>
          </section>
          <section aria-labelledby="by-family">
            <h3 id="by-family">
              {t("Biggest plant families", "最大的植物科")}
            </h3>
            <Bars rows={byFamily} />
          </section>
        </div>
      </Reveal>

      <section className="plants-list" aria-labelledby="plants-all">
        <h2 id="plants-all">
          {t("Every kind, one page each", "每一種樹，各有一頁")}
        </h2>
        <form
          className="plants-filters"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label>
            <span>{t("Search", "搜尋")}</span>
            <input
              type="search"
              value={query}
              placeholder={t(
                "e.g. 榕樹, banyan, Ficus",
                "例如：榕樹、banyan、Ficus",
              )}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(48);
              }}
            />
          </label>
          <label>
            <span>{t("Growing type", "型態")}</span>
            <select
              value={habit}
              onChange={(event) => {
                setHabit(event.target.value as PlantHabit | "all");
                setShown(48);
              }}
            >
              <option value="all">{t("All", "全部")}</option>
              {habits.map((key) => (
                <option key={key} value={key}>
                  {habitLabels[key][language]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Origin", "來源")}</span>
            <select
              value={origin}
              onChange={(event) => {
                setOrigin(event.target.value as typeof origin);
                setShown(48);
              }}
            >
              <option value="all">{t("All", "全部")}</option>
              <option value="native">{originLabels.native[language]}</option>
              <option value="introduced">
                {originLabels.introduced[language]}
              </option>
            </select>
          </label>
          <label>
            <span>{t("Sort by", "排序")}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="count">{t("Most trees", "棵數最多")}</option>
              <option value="height">
                {t("Tallest typical tree", "典型樹高最高")}
              </option>
              <option value="name">{t("Name", "名稱")}</option>
            </select>
          </label>
        </form>
        <p className="plants-count" role="status">
          {t(
            `${format(visible.length)} kinds shown`,
            `顯示 ${format(visible.length)} 種`,
          )}
        </p>
        <ul className="plants-cards">
          {visible.slice(0, shown).map((row) => (
            <li key={row.name}>
              <Link href={`/plants/${encodeURIComponent(row.name)}`}>
                <PhotoThumb
                  photoKey={row.name}
                  kind="plant"
                  size={0}
                  width={500}
                  radius={0}
                  className="plants-card-photo"
                />
                <span className="plants-card-body">
                  <span className="plants-card-name" lang="zh-TW">
                    {row.name}
                  </span>
                  {row.en && <span className="plants-card-en">{row.en}</span>}
                  {row.sci && <i className="plants-card-sci">{row.sci}</i>}
                  <span className="plants-card-meta">
                    {row.habit && <HabitTag habit={row.habit} short />}
                    <b>
                      {format(row.count)} {t("trees", "棵")}
                    </b>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {visible.length > shown && (
          <button
            type="button"
            className="plants-more"
            onClick={() => setShown((value) => value + 48)}
          >
            {t("Show more", "顯示更多")}
          </button>
        )}
        <p className="plants-aside">
          {t(
            "Sources: Taipei Parks and Street Lights Office park tree inventory, 2016–2026, and the city’s one-off 2016–2017 riverside tree survey. Open Government Data License 1.0.",
            "資料來源：臺北市公園路燈工程管理處公園樹木盤點（2016–2026）與市府 2016–2017 年一次性河濱喬木調查；政府資料開放授權條款第 1 版。",
          )}
        </p>
      </section>
      <Footer />
    </main>
  );
}

export function PlantProfile({ row }: { row: PlantRow }) {
  const { t, language } = useLanguage();
  const info = findPlant(row.name);
  const format = (n: number) =>
    n.toLocaleString(language === "zh" ? "zh-TW" : "en-US");
  const mapQuery = encodeURIComponent(row.name);
  return (
    <main id="main" data-subject="plants" className="plants-page">
      <Link className="text-link" href="/plants">
        <ArrowLeft size={15} />
        {t("All trees", "所有樹種")}
      </Link>
      <header className="plants-hero plants-hero-profile">
        <h1 lang="zh-TW">
          {language === "zh" ? row.name : row.en || row.name}
        </h1>
        <p className="plants-names">
          {language === "zh" ? (
            row.en && <span>{row.en}</span>
          ) : (
            <span lang="zh-TW">{row.name}</span>
          )}
          {row.sci && <i>{row.sci}</i>}
        </p>
        <ul className="plants-chips" aria-label={t("Quick facts", "重點資料")}>
          {row.habit && (
            <li>
              <HabitTag habit={row.habit} />
            </li>
          )}
          {row.origin && <li>{originLabels[row.origin][language]}</li>}
          {row.endemic && <li>{t("Taiwan endemic", "臺灣特有")}</li>}
          {row.familyZh && (
            <li>
              {row.family ? `${row.family} ` : ""}
              {row.familyZh}
            </li>
          )}
        </ul>
      </header>

      <section className="plants-gallery" aria-labelledby="meet-plant">
        <h2 id="meet-plant">{t("Meet this tree", "認識這種樹")}</h2>
        <WikiGallery
          latin={row.sci || ""}
          photoKey={row.name}
          zhName={row.name}
          enName={row.en}
          searchTerm={row.sci || row.name}
          lead={
            info ? (
              <p className="plants-note">{info.note[language]}</p>
            ) : (
              <p className="plants-note">
                {t(
                  "This kind is in the inventories but does not have a written entry in the guide yet. Its counts and sizes below come straight from the survey.",
                  "這種樹出現在清冊中，但導覽尚未撰寫介紹；以下數量與尺寸直接來自調查資料。",
                )}
              </p>
            )
          }
        />
        <p className="plants-aside">
          {t(
            "Photos come from Wikimedia Commons and the summary from Wikipedia; each photo keeps its photographer’s credit and licence. More photos load live in your browser.",
            "照片取自維基共享資源、摘要取自維基百科，每張照片保留攝影者署名與授權；更多照片由你的瀏覽器即時載入。",
          )}
        </p>
      </section>

      <Reveal as="section" className="plants-stats">
        <h2>{t("In Taipei’s inventories", "在臺北市的清冊裡")}</h2>
        <dl className="plants-stat-grid">
          <div>
            <dt>{t("Trees recorded", "紀錄棵數")}</dt>
            <dd>{format(row.count)}</dd>
            <dd className="plants-stat-note">
              {t(
                `${format(row.park)} in parks · ${format(row.riverside)} on riverbanks`,
                `公園 ${format(row.park)}・河濱 ${format(row.riverside)}`,
              )}
            </dd>
          </div>
          <div>
            <dt>{t("Typical height", "典型樹高")}</dt>
            <dd>
              {row.medianHeightM !== null ? `${row.medianHeightM} m` : "—"}
            </dd>
            <dd className="plants-stat-note">
              {row.p90HeightM !== null
                ? t(
                    `9 in 10 are under ${row.p90HeightM} m`,
                    `九成低於 ${row.p90HeightM} 公尺`,
                  )
                : t("Median of reported heights", "紀錄樹高的中位數")}
            </dd>
          </div>
          <div>
            <dt>{t("Typical trunk width", "典型胸徑")}</dt>
            <dd>
              {row.medianDiameterCm !== null
                ? `${row.medianDiameterCm} cm`
                : "—"}
            </dd>
            <dd className="plants-stat-note">
              {t("Median diameter at breast height", "胸高直徑中位數")}
            </dd>
          </div>
          <div>
            <dt>{t("Places it grows", "分布的公園數")}</dt>
            <dd>{format(row.places)}</dd>
            <dd className="plants-stat-note">
              {t("parks and riverside sites", "公園與河濱地點")}
            </dd>
          </div>
        </dl>
        <div className="plants-where">
          <section aria-labelledby="plant-districts">
            <h3 id="plant-districts">
              {t("Districts with the most", "數量最多的行政區")}
            </h3>
            <Bars
              rows={row.districts.map(([name, count]) => ({
                key: name,
                label: name,
                count,
              }))}
            />
            {row.riverside > 0 && row.park === 0 && (
              <p className="plants-aside">
                {t(
                  "This kind appears only in the riverside survey, which records no districts.",
                  "這種樹只出現在河濱調查中，該調查未記錄行政區。",
                )}
              </p>
            )}
          </section>
          <section aria-labelledby="plant-places">
            <h3 id="plant-places">{t("Parks to look in", "可以去找的公園")}</h3>
            <ol className="plants-places">
              {row.topPlaces.map(([name, count]) => (
                <li key={name}>
                  <span>{name}</span>
                  <b>{format(count)}</b>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <p className="plants-actions">
          {row.park > 0 && (
            <Link
              className="text-link"
              href={`/urban?dataset=taipei-park-trees&q=${mapQuery}`}
            >
              {t("Find these trees on the park map", "在公園地圖上找這些樹")}
              <ArrowUpRight size={15} />
            </Link>
          )}
          {row.riverside > 0 && (
            <Link
              className="text-link"
              href={`/urban?dataset=taipei-riverside-trees&q=${mapQuery}`}
            >
              {t("Find them on the riverside map", "在河濱地圖上找")}
              <ArrowUpRight size={15} />
            </Link>
          )}
        </p>
        <p className="plants-aside">
          {t(
            "Inventories record that a tree was surveyed, not that it stands today, and the city is still reconciling removals and transplants. Some heights are obvious entry errors; medians and the 90th percentile are used so a few of them do not distort the numbers.",
            "清冊只代表樹曾被調查，不代表現在仍在原處，市府仍在核對移除與移植；少數樹高明顯是登錄錯誤，因此採用中位數與第 90 百分位，避免少數錯誤影響數字。",
          )}
        </p>
      </Reveal>
      <Footer />
    </main>
  );
}
