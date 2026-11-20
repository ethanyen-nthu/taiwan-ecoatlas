"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Map as MapIcon } from "lucide-react";
import { lessonsFor, type L } from "@/content/lesson-index";
import type { PeopleCardData, VillageData } from "@/lib/culture-types";
import { islandPath, islandViewBox } from "@/lib/island-path";
import { Footer } from "../footer";
import { useLanguage } from "../providers";
import { OutlineMap } from "./outline-map";
import { PeopleFacts } from "./people-facts";
import "../teach/teach.css";
import "./culture.css";

export function VillageProfile({ data }: { data: VillageData }) {
  const { language, t } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  const zh = language === "zh";
  const title = zh ? data.titleZh : data.title;
  const subtitle = zh
    ? data.traditionalName && data.traditionalName !== data.titleZh
      ? data.traditionalName
      : null
    : data.titleZh;
  const peopleNames = data.peoples.map((people) => tl(people.name));
  const place = [
    zh ? data.countyName : data.countyEn || data.countyName,
    data.township,
  ]
    .filter(Boolean)
    .join(zh ? "" : " · ");
  const lesson = lessonsFor("culture")[0];
  const mapQuery = encodeURIComponent(data.titleZh);
  const facts: { label: string; value: string | null; note?: string }[] = [
    {
      label: t("Source-listed group", "來源所列族別"),
      value: data.group || null,
    },
    {
      label: t("County and township", "縣市與鄉鎮"),
      value: [data.countyName, data.township].filter(Boolean).join(" ") || null,
    },
    {
      label: t("Administrative village (里)", "行政里"),
      value: data.villageUnit,
    },
    {
      label: t("Public reference point", "公開定位點"),
      value: data.referencePoint,
    },
    {
      label: t("Traditional name", "傳統名制"),
      value: data.traditionalName,
    },
    {
      label: t("Listed in the catalogue", "資料列載日期"),
      value: data.listedAt,
      note: t(
        "a catalogue date, not a founding date",
        "是資料列載日期，不是成立日期",
      ),
    },
    {
      label: t("Source record", "原始紀錄"),
      value: data.sourceRecordId
        ? `${data.sourceRecordId} · ${data.sourceId}`
        : data.sourceId,
    },
  ];
  return (
    <main
      id="main"
      className="document-page teach cp"
      data-subject="culture"
      data-page="village-profile"
    >
      <nav className="teach-crumb" aria-label={t("Breadcrumb", "麵包屑")}>
        <Link href="/culture">{t("Cultural atlas", "文化地圖")}</Link>
        {" › "}
        <Link href="/culture/peoples">{t("Peoples", "族群")}</Link>
        {data.peoples[0] && (
          <>
            {" › "}
            <Link href={`/culture/peoples/${data.peoples[0].slug}`}>
              {tl(data.peoples[0].name)}
            </Link>
          </>
        )}
      </nav>
      <header className="teach-head">
        <div className="teach-head-copy">
          <p className="cp-kicker">
            {peopleNames.length
              ? peopleNames.join(" · ")
              : t("Village listing", "部落列載")}
            {place && ` — ${place}`}
          </p>
          <h1>{title}</h1>
          {subtitle && <p className="cp-subtitle">{subtitle}</p>}
          <ul className="teach-meta">
            {data.referencePoint && (
              <li>
                {t("Public reference point", "公開定位點")}：
                {data.referencePoint}
              </li>
            )}
            {data.listedAt && (
              <li>
                {t("Listed", "列載")} {data.listedAt}
              </li>
            )}
          </ul>
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
          <section aria-labelledby="cp-glance">
            <h2 id="cp-glance">{t("At a glance", "重點摘要")}</h2>
            <dl className="cp-facts">
              {facts
                .filter((fact) => fact.value)
                .map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>
                      {fact.value}
                      {fact.note && <small>{fact.note}</small>}
                    </dd>
                  </div>
                ))}
            </dl>
            {data.sharedPoint.length > 0 && (
              <p className="cp-callout">
                {t(
                  `${data.sharedPoint.length} other listed ${data.sharedPoint.length === 1 ? "village shares" : "villages share"} this exact reference point: `,
                  `另有 ${data.sharedPoint.length} 個列載部落共用這個定位點：`,
                )}
                {data.sharedPoint.map((item, index) => (
                  <span key={item.id}>
                    {index > 0 && (zh ? "、" : ", ")}
                    <Link href={`/culture/places/${item.id}`}>
                      {zh ? item.titleZh : item.title}
                    </Link>
                  </span>
                ))}
                .
              </p>
            )}
          </section>

          {data.peoples.map((people) => (
            <PeopleSection key={people.slug} people={people} />
          ))}
          {data.peoples.length === 0 && data.group && (
            <section aria-labelledby="cp-group">
              <h2 id="cp-group">{t("About the group", "關於這個族別")}</h2>
              <p>
                {t(
                  `The source lists this village under “${data.group}”, which this atlas has no profile for.`,
                  `來源將這個部落列在「${data.group}」之下，本地圖尚無此族別的介紹。`,
                )}
              </p>
            </section>
          )}

          <section aria-labelledby="cp-near">
            <h2 id="cp-near">
              {t("Nearby villages in the listing", "附近的列載部落")}
            </h2>
            <p className="cp-lede">
              {t(
                "Straight-line distance between public reference points, not travel distance.",
                "公開定位點之間的直線距離，不是行車距離。",
              )}
            </p>
            <ul className="cp-nearby">
              {data.nearby.map((item) => (
                <li key={item.id} data-same={item.same ? "" : undefined}>
                  <Link href={`/culture/places/${item.id}`}>
                    <strong>{zh ? item.titleZh : item.title}</strong>
                    <span>
                      {item.peoples.map((people) => tl(people)).join(" · ")}
                      {item.township && ` · ${item.township}`}
                    </span>
                    <b>{item.km.toLocaleString(zh ? "zh-TW" : "en")} km</b>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {data.townshipSummary && (
            <section aria-labelledby="cp-town">
              <h2 id="cp-town">
                {t(
                  `In ${data.townshipSummary.name}`,
                  `在${data.townshipSummary.name}`,
                )}
              </h2>
              <p>
                {t(
                  `The listing names ${data.townshipSummary.total} village${data.townshipSummary.total === 1 ? "" : "s"} in ${data.townshipSummary.name}: `,
                  `名單在${data.townshipSummary.name}列有 ${data.townshipSummary.total} 個部落：`,
                )}
                {data.townshipSummary.byPeople
                  .map((row) => `${tl(row.name)} ${row.n}`)
                  .join(zh ? "、" : ", ")}
                {t(
                  ". A village naming two peoples is counted for each.",
                  "。同時列出兩個族別的部落各算一次。",
                )}
              </p>
            </section>
          )}

          <section aria-labelledby="cp-read">
            <h2 id="cp-read">
              {t("How to read this record", "如何解讀這筆紀錄")}
            </h2>
            <ul className="cp-list">
              <li>
                {t(
                  "The dot is a public reference point that locates the listing, such as a road junction or a police station. It is an index to a record, not a boundary, a village centre or a claim to land.",
                  "地圖上的點是用來定位這筆列載的公開定位點（例如路口或派出所），是紀錄的索引，不是邊界、部落中心，也不是土地主張。",
                )}
              </li>
              <li>
                {t(
                  "The listing date is when the record entered the open catalogue. It says nothing about when the community began.",
                  "列載日期是紀錄進入開放資料目錄的日期，與部落何時形成無關。",
                )}
              </li>
              <li>
                {t(
                  "The source lists one group label per record. Communities can be mixed, and people can belong to more than one tradition.",
                  "來源每筆紀錄只列一個族別標籤；部落可能是混居的，個人也可能同時屬於不止一個傳統。",
                )}
              </li>
              <li>{tl(data.dataset.limitation)}</li>
            </ul>
          </section>

          <section aria-labelledby="cp-pics">
            <h2 id="cp-pics">
              {t("Pictures and further reading", "圖片與延伸閱讀")}
            </h2>
            <p>
              {t(
                "This page shows no photographs. The open government data behind it contains none, and a photograph of identifiable people should only be used with their consent. To see licensed images, search Wikimedia Commons, where every photograph carries its own credit and licence, and look for work credited to community members themselves.",
                "本頁不放照片：背後的政府開放資料沒有照片，而可辨識人物的照片應取得當事人同意才能使用。若想看已授權的圖片，可到維基共享資源搜尋；每張照片都標有各自的來源與授權，並建議優先選用部落成員自己的作品。",
              )}
            </p>
            <ul className="cp-links">
              {data.peoples.map((people) => (
                <li key={people.slug}>
                  <a
                    href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(`${people.name.en} people Taiwan`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t(
                      `Images of the ${people.name.en} on Wikimedia Commons`,
                      `在維基共享資源查看${people.name.zh}的圖片`,
                    )}
                    <ArrowUpRight size={14} />
                  </a>
                </li>
              ))}
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
          </section>

          <section aria-labelledby="cp-source">
            <h2 id="cp-source">{t("Source", "資料來源")}</h2>
            <p>
              {tl(data.dataset.title)} · {t("Licence", "授權")}:{" "}
              {data.dataset.licence}
            </p>
            <ul className="cp-links">
              <li>
                <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                  {t("Original dataset", "原始資料集")}
                  <ArrowUpRight size={14} />
                </a>
              </li>
              {data.dataset.licenceUrl && (
                <li>
                  <a
                    href={data.dataset.licenceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {data.dataset.licence}
                    <ArrowUpRight size={14} />
                  </a>
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside
          className="cp-aside"
          aria-label={t("Map and tools", "地圖與工具")}
        >
          <h2 className="cp-aside-title">
            {t("Where it sits", "位置")}
            <span>{place}</span>
          </h2>
          <OutlineMap
            data={data.map}
            label={{
              en: `Map of ${data.countyEn || "the county"} showing ${data.title} and nearby villages`,
              zh: `${data.countyName || "縣市"}地圖，標示${data.titleZh}與附近部落`,
            }}
            legend={[
              { kind: "self", text: { en: "This village", zh: "本部落" } },
              {
                kind: "same",
                text: { en: "Same people, nearby", zh: "同族別、附近" },
              },
              {
                kind: "other",
                text: { en: "Another group, nearby", zh: "其他族別、附近" },
              },
            ]}
          />
          <p className="cp-map-note">
            {t(
              "Simplified county outline. Dots are public reference points; they show where a listing is indexed, not where a community's land lies.",
              "簡化的縣市輪廓。點為公開定位點，顯示列載的索引位置，而非部落土地範圍。",
            )}
          </p>
          <div className="cp-actions">
            <Link className="cp-button" href={`/culture?q=${mapQuery}`}>
              <MapIcon size={16} />
              {t("Find it on the full map", "在完整地圖上找到它")}
            </Link>
            {lesson && (
              <Link
                className="cp-button cp-button-quiet"
                href={`/teach/${lesson.slug}`}
              >
                <ArrowLeft size={16} style={{ transform: "scaleX(-1)" }} />
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

function PeopleSection({ people }: { people: PeopleCardData }) {
  const { language, t } = useLanguage();
  const tl = (text: L) => (language === "en" ? text.en : text.zh);
  return (
    <section className="cp-people" aria-labelledby={`cp-people-${people.slug}`}>
      <h2 id={`cp-people-${people.slug}`}>
        {t(`About the ${people.name.en}`, `關於${people.name.zh}`)}
      </h2>
      <PeopleFacts people={people} />
      <p className="cp-lead">{tl(people.summary)}</p>
      <div className="cp-terms-wrap">
        <h3>{t("Words worth knowing", "值得認識的詞彙")}</h3>
        <dl className="cp-terms">
          {people.terms.map((term) => (
            <div key={term.term}>
              <dt>{term.term}</dt>
              <dd>{tl(term.gloss)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Link className="cp-button" href={`/culture/peoples/${people.slug}`}>
        {t(
          `Read the full profile of the ${people.name.en}`,
          `閱讀${people.name.zh}的完整介紹`,
        )}
        <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
