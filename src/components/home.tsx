"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleCheck } from "lucide-react";
import Explorer from "./map/explorer";
import { useLanguage, useObservations } from "./providers";
import { Footer } from "./footer";
import { Status } from "./status";
import { HomeJourney } from "./home-journey";
import { CountySnapshot } from "./county-snapshot";
import type { SnapshotCounty } from "@/lib/county-snapshot";
import type { JourneyMarks } from "@/server/journey";

/** Numbers counted from the published data files on the server. */
export interface HomeFacts {
  wildlifeRecords: number;
  species: number;
  firstYear: string;
  lastYear: string;
  villages: number;
  groups: number;
  parks: number;
  parkTrees: number;
  plantTrees: number;
  plantKinds: number;
  forestTop: { en: string; zh: string; sharePct: number } | null;
}
export function Home({
  facts,
  marks,
  counties,
}: {
  facts: HomeFacts;
  marks: JourneyMarks;
  counties: SnapshotCounty[];
}) {
  const { t } = useLanguage(),
    aqi = useObservations("aqi"),
    weather = useObservations("weather");
  return (
    <main id="main">
      <section className="home-hero">
        <div className="hero-copy">
          <h1>
            {t(
              "What the open data says about Taiwan’s environment,",
              "開放資料怎麼說臺灣的環境，",
            )}
            <em>{t("and what it leaves out.", "以及它沒說的部分。")}</em>
          </h1>
          <p>
            {t(
              "Air quality and weather from MOENV and CWA, reservoir storage from the Water Resources Agency, 2023 forest cover, a screened wildlife subset, 730 villages and a guide to Taipei’s trees. Every layer shows its source, its date and its gaps.",
              "環境部與中央氣象署的空品與氣象、水利署的水庫蓄水、2023 年森林覆蓋、經篩選的野生動物子集、730 個部落與臺北樹木導覽。每個圖層都標明來源、日期與缺口。",
            )}
          </p>
          <div className="hero-actions">
            <Link href="/explore" className="button">
              {t("Open the map", "開啟地圖")}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/about">
              {t("How the atlas works", "EcoAtlas 如何運作")}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-status">
          <p className="hero-status-title">
            {t("Source status right now", "目前的資料來源狀態")}
          </p>
          <dl>
            <div>
              <dt>{t("County geography", "縣市地理")}</dt>
              <dd>
                <span className="verified-inline">
                  <CircleCheck size={14} />
                  22 {t("verified units", "已驗證行政區")}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("Air quality · MOENV", "空氣品質・環境部")}</dt>
              <dd>
                <Status status={aqi.data?.status} loading={aqi.loading} />
              </dd>
            </div>
            <div>
              <dt>{t("Weather · CWA", "氣象・中央氣象署")}</dt>
              <dd>
                <Status
                  status={weather.data?.status}
                  loading={weather.loading}
                />
              </dd>
            </div>
          </dl>
          <Link className="text-link" href="/sources">
            {t("All sources and licences", "所有來源與授權")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="hero-map">
          <Explorer compact island />
          <div className="map-caption">
            {t(
              "22 official counties and cities · Taiwan and its offshore islands",
              "22 個官方縣市・臺灣本島與離島",
            )}
          </div>
        </div>
      </section>
      <HomeJourney facts={facts} marks={marks} />
      <CountySnapshot counties={counties} />
      <section className="principles">
        <h2>
          {t(
            "Every dataset keeps its own date, coverage and gaps.",
            "每個資料集都保留自己的年代、範圍與缺口。",
          )}
        </h2>
        <div className="principles-body">
          <p>
            {t(
              "Historical archives stay historical. Station measurements stay local. Missing data stays visible instead of being filled in.",
              "歷史典藏保留其年代，測站數據反映當地實測，資料缺口保持可見而不補造。",
            )}
          </p>
          <p>
            {t(
              "Each available dataset lists its agency, observation time, retrieval status and licence.",
              "每個可用資料集都列出機關、觀測時間、擷取狀態與授權。",
            )}
          </p>
          <Link className="text-link" href="/sources">
            {t("Read the source notes", "閱讀資料來源說明")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
