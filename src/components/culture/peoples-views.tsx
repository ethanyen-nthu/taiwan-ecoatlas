"use client";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Map as MapIcon,
} from "lucide-react";
import { lessonsFor, type L } from "@/content/lesson-index";
import { peopleBriefs } from "@/content/peoples-index";
import type { PeopleProfile } from "@/content/peoples";
import type { PeoplePageData } from "@/lib/culture-types";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { Footer } from "../footer";
import { SectionTabs } from "../section-tabs";
import { useLanguage } from "../providers";
import { OutlineMap } from "./outline-map";
import { PeopleFacts, useFactText } from "./people-facts";
import "../teach/teach.css";
import "./culture.css";

const dataLinks = [
  {
    href: "https://www.moi.gov.tw/News_Content.aspx?n=2905&s=336847",
    title: {
      en: "Ministry of the Interior: Indigenous population at the end of 2025",
      zh: "內政部：114 年底原住民人口概況",
    },
  },
  {
    href: "https://data.gov.tw/dataset/176082",
    title: {
      en: "Open data: Indigenous population by people (Council of Indigenous Peoples)",
      zh: "開放資料：原住民族人口統計（依族群別，原住民族委員會）",
    },
  },
  {
    href: "https://en.wikipedia.org/wiki/List_of_Indigenous_peoples_of_Taiwan",
    title: {
      en: "List of Indigenous peoples of Taiwan (encyclopedia overview)",
      zh: "臺灣原住民族列表（百科概覽，英文）",
    },
  },
  {
    href: "https://iwgia.org/en/taiwan/5133-iw-2023-taiwan.html",
    title: {
      en: "IWGIA: The Indigenous World 2023, Taiwan",
      zh: "IWGIA：《2023 年原住民世界》臺灣篇（英文）",
    },
  },
];

const timeline: { year: string; peoples: string[] }[] = [
  {
    year: "≤ 2000",
    peoples: [
      "amis",
      "atayal",
      "paiwan",
      "bunun",
      "puyuma",
      "rukai",
      "tsou",
      "saisiyat",
      "tao",
    ],
  },
  { year: "2001", peoples: ["thao"] },
  { year: "2002", peoples: ["kavalan"] },
  { year: "2004", peoples: ["truku"] },
  { year: "2007", peoples: ["sakizaya"] },
  { year: "2008", peoples: ["seediq"] },
  { year: "2014", peoples: ["hlaalua", "kanakanavu"] },
];

export function PeoplesIndex({ counts }: { counts: Record<string, number> }) {
  const { language, t } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  const text = useFactText();
  const most = Math.max(...Object.values(counts), 1);
  const nameOf = (slug: string) =>
    tl(peopleBriefs.find((item) => item.slug === slug)!.name);
  return (
    <main
      id="main"
      className="document-page teach cp"
      data-subject="culture"
      data-page="peoples-index"
    >
      <nav className="teach-crumb" aria-label={t("Breadcrumb", "麵包屑")}>
        <Link href="/culture">{t("Cultural atlas", "文化地圖")}</Link>
        {" › "}
        {t("Peoples", "族群")}
      </nav>
      <header className="teach-head">
        <div className="teach-head-copy">
          <h1>{t("Sixteen peoples", "十六個族群")}</h1>
          <p>
            {t(
              "Before you read a dot on the map, meet the people it points to. These are the Indigenous peoples named in the atlas's village listing: who they are, where they live, how each came to be officially recognised, and the history and ideas worth knowing.",
              "在讀地圖上的點之前，先認識它所指向的人。這裡是地圖部落名單所列的原住民族：他們是誰、住在哪裡、如何獲得官方承認，以及值得認識的歷史與概念。",
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
      </header>
      <SectionTabs section="culture" current="peoples" />

      <section className="cp-block" aria-labelledby="cp-timeline">
        <h2 id="cp-timeline">{t("How the list grew", "名單如何增加")}</h2>
        <p className="cp-lede">
          {t(
            "Nine peoples were already on the state's list. Seven more were recognised between 2001 and 2014, most of them after decades of campaigning by communities that had been counted inside another group. Ten plains peoples, such as the Siraya, are still not on the list. A law on plains Indigenous status was promulgated on 23 October 2025, but each people must first apply to be recognised.",
            "原本的名單有九族；2001 至 2014 年間又增加七族，多半經歷了原本被算在其他族群之下的社群數十年的爭取。西拉雅等十個平埔族群仍不在名單上。2025 年 10 月 23 日公布施行了規範平埔原住民身分的法律，但各族須先申請認定。",
          )}
        </p>
        <ol className="cp-timeline">
          {timeline.map((row) => (
            <li key={row.year}>
              <b>
                {row.year === "≤ 2000"
                  ? t("Before 2001", "2001 年前")
                  : row.year}
              </b>
              <span>
                {row.peoples.map((slug, index) => (
                  <span key={slug}>
                    {index > 0 && (language === "zh" ? "、" : ", ")}
                    <Link href={`/culture/peoples/${slug}`}>
                      {nameOf(slug)}
                    </Link>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="cp-block" aria-labelledby="cp-all">
        <h2 id="cp-all">{t("The peoples", "各族群")}</h2>
        <p className="cp-lede">
          {t(
            "The bar shows how many villages the atlas's source lists for each people. It counts listings, not people, and not how important or how large a community is. A village the source lists under two peoples counts once for each.",
            "長條顯示資料來源為各族群列載的部落數。它計算的是列載筆數，不是人口，也不代表社群的重要性或大小；來源同時列出兩個族別的部落，各算一次。",
          )}
        </p>
        <ul className="cp-cards">
          {peopleBriefs.map((people) => {
            const n = counts[people.slug] || 0;
            return (
              <li key={people.slug}>
                <Link href={`/culture/peoples/${people.slug}`}>
                  <span className="cp-card-name">
                    <strong lang={language === "zh" ? undefined : "zh-Hant"}>
                      {language === "zh" ? people.name.zh : people.name.en}
                    </strong>
                    <span>
                      {language === "zh" ? people.name.en : people.name.zh}
                    </span>
                  </span>
                  <span className="cp-card-line">{tl(people.line)}</span>
                  <span className="cp-card-meta">
                    <span>{text.where(people)}</span>
                    <span>
                      {t("Registered people", "登記人口")}:{" "}
                      {text.population(people)}
                    </span>
                  </span>
                  <span className="cp-bar" aria-hidden="true">
                    <i style={{ width: `${(n / most) * 100}%` }} />
                  </span>
                  <span className="cp-card-count">
                    {t(
                      `${n.toLocaleString()} ${n === 1 ? "village" : "villages"} listed`,
                      `列載 ${n.toLocaleString()} 個部落`,
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cp-block" aria-labelledby="cp-sources">
        <h2 id="cp-sources">
          {t("Where the numbers and names come from", "數字與名稱的來源")}
        </h2>
        <p className="cp-lede">
          {t(
            "Counts of the three largest peoples are the Ministry of the Interior's figures for the end of 2025 (629,456 registered Indigenous people, 2.7% of the population). Other populations are rounded estimates and change every month; use the open data below for exact, current numbers.",
            "三個人口最多族群的數字取自內政部 114 年底統計（登記原住民 629,456 人，占總人口 2.7%）；其他族群為四捨五入的估計值，且每月變動，需精確數字請使用下列開放資料。",
          )}
        </p>
        <ul className="cp-links">
          {dataLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {tl(link.title)}
                <ArrowUpRight size={14} />
              </a>
            </li>
          ))}
        </ul>
      </section>
      <Footer />
    </main>
  );
}

function Paragraphs({ items }: { items: L[] }) {
  const { language } = useLanguage();
  return (
    <>
      {items.map((item, index) => (
        <p key={index}>{language === "en" ? item.en : item.zh}</p>
      ))}
    </>
  );
}

export function PeopleProfileView({
  profile,
  data,
}: {
  profile: PeopleProfile;
  data: PeoplePageData;
}) {
  const { language, t } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  const zh = language === "zh";
  const lesson = lessonsFor("culture")[0];
  return (
    <main
      id="main"
      className="document-page teach cp"
      data-subject="culture"
      data-page="people-profile"
    >
      <nav className="teach-crumb" aria-label={t("Breadcrumb", "麵包屑")}>
        <Link href="/culture">{t("Cultural atlas", "文化地圖")}</Link>
        {" › "}
        <Link href="/culture/peoples">{t("Peoples", "族群")}</Link>
        {" › "}
        {tl(profile.name)}
      </nav>
      <header className="teach-head">
        <div className="teach-head-copy">
          <p className="cp-kicker">
            {t("Indigenous people of Taiwan", "臺灣原住民族")}
          </p>
          <h1>{zh ? profile.name.zh : profile.name.en}</h1>
          <p className="cp-subtitle">
            {zh ? profile.name.en : profile.name.zh}
            {profile.selfName && (
              <>
                {" · "}
                {t("self-name", "自稱")} {profile.selfName}
              </>
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
      </header>

      <div className="cp-layout">
        <div className="cp-main">
          <section aria-labelledby="pp-glance">
            <h2 id="pp-glance">{t("At a glance", "重點摘要")}</h2>
            <PeopleFacts people={{ ...profile, villages: data.villages }} />
            <p className="cp-lead">{tl(profile.summary)}</p>
          </section>

          <section aria-labelledby="pp-history">
            <h2 id="pp-history">{t("History", "歷史")}</h2>
            <Paragraphs items={profile.history} />
          </section>

          <section aria-labelledby="pp-today">
            <h2 id="pp-today">{t("Living culture today", "活的文化")}</h2>
            <Paragraphs items={profile.today} />
          </section>

          <section aria-labelledby="pp-terms">
            <h2 id="pp-terms">{t("Words worth knowing", "值得認識的詞彙")}</h2>
            <dl className="cp-terms">
              {profile.terms.map((term) => (
                <div key={term.term}>
                  <dt>{term.term}</dt>
                  <dd>{tl(term.gloss)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="pp-discuss" className="cp-discuss">
            <h2 id="pp-discuss">{t("For discussion", "討論題")}</h2>
            <p>{tl(profile.discuss)}</p>
          </section>

          <section aria-labelledby="pp-villages">
            <h2 id="pp-villages">
              {t("Villages in the atlas", "地圖中列載的部落")}
            </h2>
            <p className="cp-lede">
              {t(
                `The source lists ${data.villages.toLocaleString()} villages for the ${profile.name.en} across ${data.counties.length} counties and cities. Each opens its own profile.`,
                `資料來源為${profile.name.zh}列載 ${data.villages.toLocaleString()} 個部落，分布於 ${data.counties.length} 個縣市；每個部落都有各自的介紹頁。`,
              )}
            </p>
            <div className="cp-counties">
              {data.counties.map((county) => (
                <details key={county.code}>
                  <summary>
                    <span>{zh ? county.name : county.en}</span>
                    <b>{county.n}</b>
                  </summary>
                  <ul>
                    {county.villages.map((village) => (
                      <li key={village.id}>
                        <Link href={`/culture/places/${village.id}`}>
                          {zh ? village.titleZh : village.title}
                        </Link>
                        {village.township && <span>{village.township}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {data.neighbours.length > 0 && (
            <section aria-labelledby="pp-shared">
              <h2 id="pp-shared">{t("Shared villages", "共居的部落")}</h2>
              <p>
                {t(
                  "Some villages are listed under more than one people. The source shares villages with: ",
                  "部分部落同時列在不止一個族別之下。來源顯示與下列族群共居：",
                )}
                {data.neighbours.map((item, index) => (
                  <span key={item.slug}>
                    {index > 0 && (zh ? "、" : ", ")}
                    <Link href={`/culture/peoples/${item.slug}`}>
                      {tl(item.name)}
                    </Link>{" "}
                    ({item.shared})
                  </span>
                ))}
                .
              </p>
            </section>
          )}

          <section aria-labelledby="pp-further">
            <h2 id="pp-further">
              {t("Pictures and further reading", "圖片與延伸閱讀")}
            </h2>
            <p>
              {t(
                "This atlas shows no photographs: the open data has none, and photographs of identifiable people need their consent. Wikimedia Commons holds openly licensed images, each with its own credit; look for work by community members. For a longer account, start with the encyclopedia article and the Council of Indigenous Peoples.",
                "本地圖不放照片：開放資料沒有照片，而可辨識人物的照片需取得當事人同意。維基共享資源收有各自標明來源的開放授權圖片，建議優先選用部落成員的作品。想讀更完整的介紹，可從百科條目與原住民族委員會開始。",
              )}
            </p>
            <ul className="cp-links">
              <li>
                <a
                  href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(`${profile.name.en} people Taiwan`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Images on Wikimedia Commons", "維基共享資源上的圖片")}
                  <ArrowUpRight size={14} />
                </a>
              </li>
              <li>
                <a
                  href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${profile.name.en.replace(/ \(.*\)/, "")} people`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Encyclopedia article (English)", "百科條目（英文）")}
                  <ArrowUpRight size={14} />
                </a>
              </li>
              <li>
                <a
                  href={`https://zh.wikipedia.org/w/index.php?search=${encodeURIComponent(profile.name.zh)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Encyclopedia article (Chinese)", "百科條目（中文）")}
                  <ArrowUpRight size={14} />
                </a>
              </li>
              <li>
                <a
                  href="https://www.cip.gov.tw/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Council of Indigenous Peoples", "原住民族委員會")}
                  <ArrowUpRight size={14} />
                </a>
              </li>
            </ul>
            <p className="cp-note">
              {t(
                "Written for this atlas as a summary of widely documented history. Where scholars or communities describe things differently, treat this as a starting point, and cite the communities' own sources in your work.",
                "本文為本地圖撰寫的概述，依據廣為記載的歷史。若學者或社群的說法不同，請視為起點，並在作業中引用社群自己的資料。",
              )}
            </p>
          </section>

          <nav className="cp-pager" aria-label={t("Other peoples", "其他族群")}>
            <Link href={`/culture/peoples/${data.prev.slug}`}>
              <ArrowLeft size={16} />
              <span>{tl(data.prev.name)}</span>
            </Link>
            <Link href="/culture/peoples">
              {t("All sixteen", "全部十六族")}
            </Link>
            <Link href={`/culture/peoples/${data.next.slug}`}>
              <span>{tl(data.next.name)}</span>
              <ArrowRight size={16} />
            </Link>
          </nav>
        </div>

        <aside
          className="cp-aside"
          aria-label={t("Map and tools", "地圖與工具")}
        >
          <h2 className="cp-aside-title">
            {t("Where its villages are listed", "列載部落的位置")}
            <span>
              {t(
                `${data.villages.toLocaleString()} reference points`,
                `${data.villages.toLocaleString()} 個定位點`,
              )}
            </span>
          </h2>
          <OutlineMap
            data={data.map}
            label={{
              en: `Map of the ${data.villages} village reference points listed for the ${profile.name.en}`,
              zh: `${profile.name.zh}列載的 ${data.villages} 個部落定位點地圖`,
            }}
            legend={[
              {
                kind: "same",
                text: {
                  en: "A listed village's reference point",
                  zh: "列載部落的公開定位點",
                },
              },
            ]}
          />
          <p className="cp-map-note">
            {t(
              "Shaded counties hold at least one listed village. Dots are public reference points, not territory. A blank area does not mean no Indigenous history there.",
              "有色的縣市至少列有一個部落。點為公開定位點，不是領域範圍；空白處不代表那裡沒有原住民族的歷史。",
            )}
          </p>
          <div className="cp-actions">
            <Link
              className="cp-button"
              href={`/culture?q=${encodeURIComponent(profile.group)}`}
            >
              <MapIcon size={16} />
              {t("Show them on the full map", "在完整地圖上顯示")}
            </Link>
            {lesson && (
              <Link
                className="cp-button cp-button-quiet"
                href={`/teach/${lesson.slug}`}
              >
                {t("Teach with this: ", "教學使用：")}
                {tl(lesson.title)}
              </Link>
            )}
          </div>
        </aside>
      </div>
      <Footer />
    </main>
  );
}
