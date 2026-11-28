"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "../providers";
import { Status } from "../status";
import {
  hazardFigures,
  todayAsOf,
  todayFigures,
  type TodayFigure,
} from "./figures";
import { useToday } from "./use-today";
import { useHazards, useNow } from "../hazards/use-hazards";
import type { TodaySummary } from "@/lib/today";
import "./today.css";

function useClock() {
  const { language } = useLanguage();
  return (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(language === "en" ? "en-GB" : "zh-TW", {
          timeZone: "Asia/Taipei",
          hour: "numeric",
          minute: "2-digit",
          hour12: language !== "en",
        }).format(new Date(iso))
      : null;
}

function Value({ figure }: { figure: TodayFigure }) {
  return (
    <>
      {figure.dot && (
        <span
          className="today-dot"
          style={{ background: figure.dot }}
          aria-hidden="true"
        />
      )}
      <b>{figure.value}</b>
      {figure.unit && <span className="today-unit"> {figure.unit}</span>}
    </>
  );
}

/** Pages where the strip would be in the way: the home page has the larger
 *  panel beside its map, and the full-screen map needs the whole window. */
const hiddenOn = (path: string | null) =>
  path === "/" || !!path?.startsWith("/explore");

/** A slim strip under the header on every other page: the current air,
 *  temperature, rain and reservoir figures, each linking to its page. */
export function TodayBar() {
  const path = usePathname();
  const { language, t } = useLanguage();
  const { today, loading } = useToday();
  const hazards = useHazards();
  const now = useNow();
  const clock = useClock();
  if (hiddenOn(path)) return null;
  const alerts = hazardFigures(hazards.data, language, now);
  const figures = [
    ...alerts.filter((figure) => figure.alert),
    ...(today ? todayFigures(today, language) : []),
    ...alerts.filter((figure) => !figure.alert),
  ];
  if (!loading && figures.length === 0) return null;
  const asOf = today ? clock(todayAsOf(today)) : null;
  return (
    <section
      className="today-bar"
      aria-label={t("Today’s readings", "今日讀數")}
      data-today="bar"
    >
      <p className="today-title">
        <b>{t("Today", "今日")}</b>
        {asOf && (
          <span>
            {" "}
            {t("as of", "更新於")} {asOf}
          </span>
        )}
      </p>
      {figures.length === 0 ? (
        <p className="today-loading">
          {t("Checking the latest readings…", "正在取得最新讀數…")}
        </p>
      ) : (
        <ul>
          {figures.map((figure) => (
            <li key={figure.key}>
              <Link href={figure.href} title={figure.detail}>
                <span className="today-label">{figure.label}</span>{" "}
                <span className="today-fig">
                  <Value figure={figure} />
                  {figure.older && (
                    <small> · {t("older reading", "較舊的讀數")}</small>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The larger version beside the map on the home page. */
export function TodayHero({
  airStatus,
  weatherStatus,
  airLoading,
  weatherLoading,
}: {
  airStatus?: TodaySummary["air"]["status"];
  weatherStatus?: TodaySummary["weather"]["status"];
  airLoading: boolean;
  weatherLoading: boolean;
}) {
  const { language, t } = useLanguage();
  const { today, loading } = useToday();
  const hazards = useHazards();
  const now = useNow();
  const clock = useClock();
  const alerts = hazardFigures(hazards.data, language, now);
  const figures = [
    ...alerts.filter((figure) => figure.alert),
    ...(today ? todayFigures(today, language) : []),
    ...alerts.filter((figure) => !figure.alert),
  ];
  const asOf = today ? clock(todayAsOf(today)) : null;
  return (
    <div className="hero-status hero-today" data-today="hero">
      <div className="hero-today-head">
        <h2 className="hero-status-title">
          {t("Today in Taiwan", "此刻的臺灣")}
        </h2>
        {asOf && (
          <span>
            {t("latest reading", "最新讀數")} {asOf}
          </span>
        )}
      </div>
      {figures.length > 0 ? (
        <ul className="hero-today-grid">
          {figures.map((figure) => (
            <li key={figure.key}>
              <Link href={figure.href}>
                <span className="today-label">{figure.label}</span>{" "}
                <span className="today-fig">
                  <Value figure={figure} />
                </span>
                <span className="today-detail">
                  {figure.detail}
                  {figure.older && <> · {t("older reading", "較舊的讀數")}</>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="today-loading" role="status">
          {loading
            ? t("Checking the latest readings…", "正在取得最新讀數…")
            : t(
                "No live readings right now. The source status below says why.",
                "目前沒有即時讀數，下方的來源狀態會說明原因。",
              )}
        </p>
      )}
      <dl className="hero-sources">
        <div>
          <dt>{t("Air quality · MOENV", "空氣品質・環境部")}</dt>
          <dd>
            <Status status={airStatus} loading={airLoading} />
          </dd>
        </div>
        <div>
          <dt>{t("Weather · CWA", "氣象・中央氣象署")}</dt>
          <dd>
            <Status status={weatherStatus} loading={weatherLoading} />
          </dd>
        </div>
        <div>
          <dt>{t("Reservoirs · WRA", "水庫・水利署")}</dt>
          <dd>
            <Status status={today?.reservoirs.status} loading={loading} />
          </dd>
        </div>
        <div>
          <dt>{t("Earthquakes · CWA", "地震・中央氣象署")}</dt>
          <dd>
            <Status
              status={hazards.data?.earthquakes.status}
              loading={hazards.loading}
            />
          </dd>
        </div>
        <div>
          <dt>{t("Cyclones · CWA", "熱帶氣旋・中央氣象署")}</dt>
          <dd>
            <Status
              status={hazards.data?.typhoon.status}
              loading={hazards.loading}
            />
          </dd>
        </div>
      </dl>
      <Link className="text-link" href="/sources">
        {t("All sources and licences", "所有來源與授權")}
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
