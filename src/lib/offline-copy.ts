import { isTracked, type HazardsResponse } from "./hazards";
import type { TodaySummary } from "./today";
import type { Freshness, Language } from "./types";

/**
 * When the page has no connection, the service worker (public/sw.js) hands
 * back the last copy of a live feed it saved, with these two headers added.
 * Such a copy is real data, but it is not today's: everything that reads it
 * here marks it as a saved copy, and its status is never "fresh".
 */
export const fromCacheHeader = "x-ecoatlas-from-cache";
export const savedAtHeader = "x-ecoatlas-saved-at";

export interface SavedCopy {
  /** When the copy was saved on this device, or null if the header was lost. */
  savedAt: string | null;
}

export function savedCopyOf(headers: Pick<Headers, "get">): SavedCopy | null {
  if (headers.get(fromCacheHeader) !== "1") return null;
  const raw = headers.get(savedAtHeader);
  const time = raw ? Date.parse(raw) : NaN;
  return {
    savedAt: Number.isFinite(time) ? new Date(time).toISOString() : null,
  };
}

/** A saved copy is at best "stale"; a status that was already worse stays. */
const aged = (status: Freshness): Freshness =>
  status === "fresh" ? "stale" : status;

export function savedDataset<
  T extends { status: Freshness; message: string | null },
>(data: T): T {
  return { ...data, status: aged(data.status), message: "saved-copy" };
}

export function savedToday(today: TodaySummary): TodaySummary {
  return {
    ...today,
    air: { ...today.air, status: aged(today.air.status) },
    weather: { ...today.weather, status: aged(today.weather.status) },
    reservoirs: { ...today.reservoirs, status: aged(today.reservoirs.status) },
  };
}

const newest = (times: (string | null | undefined)[]): string | null => {
  const valid = times.filter((time): time is string => !!time);
  return valid.length ? valid.reduce((a, b) => (a > b ? a : b)) : null;
};

/**
 * Earthquakes keep their own times, so their ages stay right on their own. A
 * cyclone was "being tracked" when the copy was saved; days later it may not
 * be, so each is judged again against the clock and any that has lapsed moves
 * to the "older tracks, not shown as current" note.
 */
export function savedHazards(
  hazards: HazardsResponse,
  now: number,
): HazardsResponse {
  const { typhoon, earthquakes } = hazards;
  const current = typhoon.cyclones.filter((cyclone) => isTracked(cyclone, now));
  const lapsed = typhoon.cyclones.filter((cyclone) => !isTracked(cyclone, now));
  const older = lapsed.length
    ? {
        count: (typhoon.older?.count ?? 0) + lapsed.length,
        newestAt: newest([
          typhoon.older?.newestAt,
          ...lapsed.map((cyclone) => cyclone.current?.time),
        ]),
      }
    : typhoon.older;
  return {
    ...hazards,
    earthquakes: { ...earthquakes, status: aged(earthquakes.status) },
    typhoon: {
      ...typhoon,
      status: aged(typhoon.status),
      cyclones: current,
      ...(older === undefined ? {} : { older }),
    },
  };
}

/** Read a live feed's JSON and, if it came from the saved copy, mark it. */
export async function readFeed<T>(
  response: Response,
  mark: (body: T) => T,
): Promise<{ body: T; saved: SavedCopy | null }> {
  const saved = savedCopyOf(response.headers);
  const body = (await response.json()) as T;
  return { body: saved ? mark(body) : body, saved };
}

/** The label for a feed's last time, in Taipei time: "14:10" today,
 *  "yesterday 14:10", or the date and time. Null with no usable time. */
export function asOfLabel(
  iso: string | null | undefined,
  now: number,
  language: Language,
): string | null {
  const time = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(time)) return null;
  const en = language === "en";
  const locale = en ? "en-GB" : "zh-TW";
  const day = (ms: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(ms);
  const clock = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Taipei",
    // English is 24-hour with two digits ("00:10"); Chinese reads "上午12:10".
    hour: en ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !en,
  }).format(time);
  const when = day(time);
  if (when >= day(now)) return clock;
  if (when === day(now - 86_400_000))
    return `${en ? "yesterday" : "昨天"} ${clock}`;
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Taipei",
    ...(en
      ? { day: "numeric" as const, month: "short" as const }
      : { month: "numeric" as const, day: "numeric" as const }),
  }).format(time);
  return `${date} ${clock}`;
}

/** Of several saved copies, the one to describe: the oldest, since that is
 *  how old the oldest thing on the screen is. Null when none is saved. */
export function oldestSaved(
  copies: (SavedCopy | null | undefined)[],
): SavedCopy | null {
  const saved = copies.filter((copy): copy is SavedCopy => !!copy);
  if (!saved.length) return null;
  if (saved.some((copy) => copy.savedAt === null)) return { savedAt: null };
  return {
    savedAt: saved.reduce((a, b) =>
      (a.savedAt as string) < (b.savedAt as string) ? a : b,
    ).savedAt,
  };
}

/** The page the offline page stands in for, from "?from=/path", or the home
 *  page. Only a path on this site is followed, never another address. */
export function wantedPage(search: string): string {
  const from = new URLSearchParams(search).get("from");
  return from && /^\/(?![/\\])/.test(from) ? from : "/";
}
