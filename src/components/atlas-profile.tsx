"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Leaf } from "lucide-react";
import type { AtlasProperties } from "@/lib/atlas-types";
import type { Localized } from "@/lib/types";
import { Footer } from "./footer";
import { WikiGallery } from "./wiki-gallery";
import {
  familyZh,
  findSpeciesInfo,
  roadNotes,
  speciesShortName,
} from "@/content/species-info";
import { wildlifeClasses } from "@/lib/wildlife";
import { useLanguage } from "./providers";
import { SplitAccordion } from "./watermelon/split-accordion";
import styles from "./atlas-profile.module.css";

export interface CulturalStudy {
  id: string;
  title: string;
  titleZh: string;
  sourceRecordId: string;
  sourceId: string;
  sourceUrl: string;
  studyYear: number;
  listedAt: string;
  descriptionZh: string;
  endpointsZh: string;
  lengthText: string;
  historicalContextZh: string;
  associatedCommunitiesZh: string;
  constructionHistoryZh: string;
  communityImpactZh: string;
  recordedConditionZh: string;
  landscapeZh: string;
  attribution: string;
  licence: string;
  licenceUrl: string;
  geometry: null;
}

export interface WildlifeSpeciesProfile {
  id: string;
  name: string;
  scientificName?: string;
  acceptedName?: string;
  count: number;
  taxonKey: number | null;
  category: string;
  family: string;
  firstDate?: string;
  lastDate?: string;
  yearCounts: Record<string, number>;
  countyCounts: Record<string, number>;
  sourceUrl: string;
  licence: string;
}

export type AtlasProfileData =
  | {
      kind: "culture";
      properties: AtlasProperties;
      datasetTitle: Localized;
      sourceUrl: string;
      licence: string;
      licenceUrl: string | null;
      limitation: Localized;
    }
  | { kind: "study"; study: CulturalStudy }
  | {
      kind: "species";
      species: WildlifeSpeciesProfile;
      counties: { code: string; name: Localized }[];
      limitation: Localized;
      licenceUrl: string | null;
    };

function Facts({
  facts,
}: {
  facts: { label: string; value: string | number | null | undefined }[];
}) {
  const { t } = useLanguage();
  return (
    <dl className="source-metadata">
      {facts.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {value === null || value === undefined || value === ""
              ? t("Not supplied", "來源未提供")
              : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SourceLinks({
  url,
  licence,
  licenceUrl,
}: {
  url: string;
  licence: string;
  licenceUrl: string | null;
}) {
  const { t } = useLanguage();
  return (
    <div className="source-links">
      <a href={url} target="_blank" rel="noreferrer">
        {t("Original dataset / official page", "原始資料集／官方頁面")}
        <ArrowUpRight size={14} />
      </a>
      {licenceUrl ? (
        <a href={licenceUrl} target="_blank" rel="noreferrer">
          {licence}
          <ArrowUpRight size={14} />
        </a>
      ) : (
        <span>{licence}</span>
      )}
    </div>
  );
}

export function AtlasProfile({ profile }: { profile: AtlasProfileData }) {
  const { t, language } = useLanguage();
  const isSpecies = profile.kind === "species";
  const title =
    profile.kind === "species"
      ? speciesShortName(
          profile.species.scientificName || profile.species.name,
          language,
        )
      : profile.kind === "study"
        ? profile.study.title
        : language === "zh"
          ? profile.properties.titleZh || profile.properties.title
          : profile.properties.title;
  return (
    <main
      id="main"
      className="document-page"
      data-subject={isSpecies ? "wildlife" : "culture"}
    >
      <Link className="text-link" href={isSpecies ? "/wildlife" : "/culture"}>
        <ArrowLeft size={15} />
        {isSpecies
          ? t("Wildlife atlas", "野生動物地圖")
          : t("Cultural atlas", "文化地圖")}
      </Link>
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {isSpecies
              ? t("PUBLISHED OBSERVATION EVIDENCE", "公開觀察紀錄")
              : t("PLACE, NAME AND SOURCE", "地方、名稱與出處")}
          </span>
          <h1>{title}</h1>
          {profile.kind === "species" && <SpeciesNames profile={profile} />}
          <p>
            {profile.kind === "culture"
              ? profile.datasetTitle[language]
              : profile.kind === "study"
                ? t(
                    "An original Council of Indigenous Peoples historical study profile.",
                    "原住民族委員會原始古道歷史研究簡介。",
                  )
                : t(
                    "Recorded frequency in the published roadkill subset, with its sampling limits preserved.",
                    "公開路死資料子集的紀錄頻次，保留調查範圍與限制。",
                  )}
          </p>
        </div>
        {isSpecies ? (
          <Leaf size={42} strokeWidth={1} />
        ) : (
          <BookOpen size={42} strokeWidth={1} />
        )}
      </div>
      {profile.kind === "culture" && <CultureContent profile={profile} />}
      {profile.kind === "study" && <StudyContent study={profile.study} />}
      {profile.kind === "species" && <SpeciesContent profile={profile} />}
      <Footer />
    </main>
  );
}

function SpeciesNames({
  profile,
}: {
  profile: Extract<AtlasProfileData, { kind: "species" }>;
}) {
  const { language } = useLanguage();
  const sci = profile.species.scientificName || profile.species.name;
  const info = findSpeciesInfo(sci);
  const names = (
    language === "zh" ? [info?.zh, info?.en] : [info?.en, info?.zh]
  ).filter((name): name is string => !!name);
  return (
    <p className={styles.speciesNames}>
      {names.map((name) => (
        <span key={name} lang={name === info?.zh ? "zh-TW" : "en"}>
          {name}
        </span>
      ))}
      {info?.aka && <span lang="zh-TW">{info.aka}</span>}
      <i>{sci}</i>
    </p>
  );
}

function CultureContent({
  profile,
}: {
  profile: Extract<AtlasProfileData, { kind: "culture" }>;
}) {
  const { t, language } = useLanguage();
  const p = profile.properties;
  const value = (key: string) =>
    typeof p[key] === "string" || typeof p[key] === "number"
      ? (p[key] as string | number)
      : null;
  return (
    <div className={styles.readingColumn}>
      <article className="source-card">
        <h2>{t("Published place record", "公開地方紀錄")}</h2>
        <Facts
          facts={[
            {
              label: t("Original name", "原始名稱"),
              value: value("titleZh") || p.title,
            },
            {
              label: t("Traditional name", "傳統名制"),
              value: value("traditionalName"),
            },
            {
              label: t("Source-listed Indigenous group", "來源所列族別"),
              value: value("group"),
            },
            {
              label: t("County", "縣市"),
              value: value("countyName") || p.countyCode,
            },
            { label: t("Township", "鄉鎮市區"), value: value("township") },
            {
              label: t("Public reference point", "公開定位點"),
              value: value("publicReferencePoint"),
            },
            {
              label: t("Source record ID", "原始紀錄編號"),
              value: value("sourceRecordId"),
            },
            {
              label: t("Source dataset ID", "來源資料集編號"),
              value: p.sourceId,
            },
            {
              label: t(
                "Catalogue listing date (not founding date)",
                "資料列載日期（非成立日期）",
              ),
              value: value("listedAt"),
            },
            {
              label: t("Source route length (metres)", "來源路線長度（公尺）"),
              value: value("lengthMetres"),
            },
          ].filter(
            (fact) =>
              fact.value !== null &&
              fact.value !== undefined &&
              fact.value !== "",
          )}
        />
        {typeof p.descriptionZh === "string" && p.descriptionZh && (
          <>
            <h3>
              {t(
                "Original description · Traditional Chinese",
                "原始簡介・正體中文",
              )}
            </h3>
            {language === "en" && (
              <p>
                {t(
                  "The source narrative is reproduced below in its original language; an English translation is not provided.",
                  "",
                )}
              </p>
            )}
            <p lang="zh-Hant" className={styles.narrative}>
              {p.descriptionZh}
            </p>
          </>
        )}
        <p className={styles.note}>{profile.limitation[language]}</p>
        <SourceLinks
          url={
            typeof p.sourceUrl === "string" ? p.sourceUrl : profile.sourceUrl
          }
          licence={profile.licence}
          licenceUrl={profile.licenceUrl}
        />
        {typeof p.catalogueUrl === "string" && (
          <div className="source-links">
            <a href={p.catalogueUrl} target="_blank" rel="noreferrer">
              {t("Source dataset catalogue", "來源資料集目錄")}
              <ArrowUpRight size={14} />
            </a>
          </div>
        )}
      </article>
    </div>
  );
}

function StudyContent({ study }: { study: CulturalStudy }) {
  const { t, language } = useLanguage();
  const narratives = [
    ["intro", t("Historical introduction", "歷史簡介"), study.descriptionZh],
    [
      "context",
      t("Historical context and construction", "歷史背景與開鑿目的"),
      study.historicalContextZh,
    ],
    [
      "communities",
      t("Source-listed communities and groups", "所經民族與部落"),
      study.associatedCommunitiesZh,
    ],
    [
      "construction",
      t("Construction and repair history", "開鑿與修建歷史"),
      study.constructionHistoryZh,
    ],
    [
      "impact",
      t("Recorded effects on communities", "原文記錄之部落影響"),
      study.communityImpactZh,
    ],
    [
      "condition",
      t("Conditions recorded in the study", "研究當時之古道現況"),
      study.recordedConditionZh,
    ],
    [
      "landscape",
      t("Cultural and natural landscape", "文化與自然地景"),
      study.landscapeZh,
    ],
  ].filter(([, , content]) => content);
  return (
    <div className={styles.readingColumn}>
      <article className="source-card">
        <h2>{t("Study provenance", "研究出處")}</h2>
        <Facts
          facts={[
            { label: t("Study year", "研究年度"), value: study.studyYear },
            {
              label: t("Catalogue listing date", "資料列載日期"),
              value: study.listedAt,
            },
            {
              label: t("Source attribution", "來源出處"),
              value: study.attribution,
            },
            {
              label: t("Source dataset ID", "來源資料集編號"),
              value: study.sourceId,
            },
            {
              label: t("Source record ID", "原始紀錄編號"),
              value: study.sourceRecordId,
            },
            {
              label: t("Source-listed endpoints", "來源起迄地點"),
              value: study.endpointsZh,
            },
            {
              label: t(
                "Source length description (km)",
                "來源長度敘述（公里）",
              ),
              value: study.lengthText,
            },
          ]}
        />
        <p className={styles.note}>
          {t(
            "This historical study contains no route geometry. Its period-specific terminology and recorded conditions are preserved as source material, not current access advice. Follow official closure notices and community restrictions.",
            "本歷史研究未提供路線幾何。保留原文時代用語與當時現況，不作現今通行指南；請遵守官方封閉公告及社群限制。",
          )}
        </p>
        <SourceLinks
          url={study.sourceUrl}
          licence={study.licence}
          licenceUrl={study.licenceUrl}
        />
      </article>
      <section aria-label={t("Original historical narratives", "原始歷史敘述")}>
        {language === "en" && (
          <p className={styles.note}>
            Original Traditional Chinese text follows. These narratives have not
            been translated into English.
          </p>
        )}
        <SplitAccordion
          items={narratives.map(([id, title, content]) => ({
            id,
            title,
            subtitle: t(
              "Original Traditional Chinese source",
              "正體中文來源原文",
            ),
            icon: <BookOpen size={17} />,
            content: (
              <p lang="zh-Hant" className={styles.narrative}>
                {content}
              </p>
            ),
          }))}
        />
      </section>
    </div>
  );
}

function SpeciesContent({
  profile,
}: {
  profile: Extract<AtlasProfileData, { kind: "species" }>;
}) {
  const { t, language } = useLanguage();
  const s = profile.species;
  const years = Object.entries(s.yearCounts).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const max = Math.max(1, ...years.map(([, count]) => count));
  const counties = Object.entries(s.countyCounts).sort(([, a], [, b]) => b - a);
  const count = (n: number) =>
    n.toLocaleString(language === "zh" ? "zh-TW" : "en-US");
  const sci = s.scientificName || s.name;
  const info = findSpeciesInfo(sci);
  const family = info?.family || s.family;
  const classLabel = wildlifeClasses[s.category];
  return (
    <div className={styles.readingColumn}>
      <article className="source-card">
        <h2>{t("Meet this animal", "認識這種動物")}</h2>
        <ul className={styles.chips} aria-label={t("Quick facts", "重點資料")}>
          {classLabel && <li>{classLabel[language]}</li>}
          {family && (
            <li>
              {family}
              {familyZh[family] ? ` ${familyZh[family]}` : ""}
            </li>
          )}
          {info?.endemic && <li>{t("Taiwan endemic", "臺灣特有")}</li>}
          {info?.introduced && <li>{t("Introduced", "外來")}</li>}
          {(info?.provisional || (info && info.zh === null)) && (
            <li
              title={t(
                "The name could not be confirmed against a second source; please check TaiCOL.",
                "此名稱尚無第二來源確認，請以 TaiCOL 為準。",
              )}
            >
              {info?.zh === null
                ? t("Chinese name to confirm", "中文名待確認")
                : t("Name to be confirmed", "名稱待確認")}
            </li>
          )}
        </ul>
        <WikiGallery
          latin={sci}
          zhName={info?.zh}
          enName={info?.en}
          lead={
            <>
              {info && (
                <p className={styles.speciesNote}>{info.note[language]}</p>
              )}
              {roadNotes[s.category] && (
                <p className={styles.speciesRoad}>
                  <b>
                    {t(
                      "Why it shows up in road records: ",
                      "為什麼會出現在路死紀錄：",
                    )}
                  </b>
                  {roadNotes[s.category][language]}
                </p>
              )}
            </>
          }
        />
        <p className={styles.note}>
          {t(
            "Photos and the summary are loaded live from Wikipedia and Wikimedia Commons in your browser; each photo keeps its photographer’s credit and licence. Chinese names follow TaiCOL conventions.",
            "照片與摘要由你的瀏覽器即時從維基百科與維基共享資源載入，每張照片保留攝影者署名與授權；中文名依 TaiCOL 慣例。",
          )}
        </p>
      </article>
      <article className="source-card">
        <h2>{t("Published subset record", "公開子集紀錄")}</h2>
        <Facts
          facts={[
            {
              label: t("Recorded observations", "紀錄筆數"),
              value: count(s.count),
            },
            { label: t("Reported class", "來源綱別"), value: s.category },
            { label: t("Reported family", "來源科別"), value: s.family },
            ...(info?.family
              ? [{ label: t("Current family", "現行科別"), value: info.family }]
              : []),
            {
              label: t("Reported scientific name", "來源學名"),
              value: s.scientificName || s.name,
            },
            {
              label: t("Accepted name in imported index", "匯入索引之接受名"),
              value: s.acceptedName,
            },
            {
              label: t("First published subset date", "子集最早日期"),
              value: s.firstDate,
            },
            {
              label: t("Last published subset date", "子集最晚日期"),
              value: s.lastDate,
            },
            { label: t("Source taxon key", "來源分類鍵值"), value: s.taxonKey },
          ]}
        />
        <p className={styles.note}>{profile.limitation[language]}</p>
        <SourceLinks
          url={s.sourceUrl}
          licence={s.licence}
          licenceUrl={profile.licenceUrl}
        />
      </article>
      <section className="source-card">
        <h2>{t("Recorded frequency by year", "各年度紀錄頻次")}</h2>
        <p>
          {t(
            "Counts describe the released subset and reporting effort; they are not a population trend or a comparable annual risk estimate.",
            "筆數描述公開子集及通報投入，不代表族群趨勢，亦非可直接比較之年度風險估計。",
          )}
        </p>
        <ul className={styles.frequencyList}>
          {years.map(([year, n]) => (
            <li key={year}>
              <span>{year}</span>
              <meter
                min={0}
                max={max}
                value={n}
                aria-label={`${year}: ${count(n)}`}
              />
              <strong>{count(n)}</strong>
            </li>
          ))}
        </ul>
      </section>
      <section className="source-card">
        <h2>{t("Counties represented in this subset", "此子集涵蓋縣市")}</h2>
        <p>
          {t(
            "Missing counties have no published records in this subset; absence of a report does not establish absence of the species.",
            "未列縣市在此子集中沒有公開紀錄；未通報不代表該物種不存在。",
          )}
        </p>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t("County", "縣市")}</th>
                <th scope="col">{t("Records", "紀錄筆數")}</th>
              </tr>
            </thead>
            <tbody>
              {counties.map(([code, n]) => (
                <tr key={code}>
                  <th scope="row">
                    {profile.counties.find((county) => county.code === code)
                      ?.name[language] || code}
                  </th>
                  <td>{count(n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
