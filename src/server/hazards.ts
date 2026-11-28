import "server-only";
import {
  isTracked,
  mergeEarthquakes,
  parseCyclones,
  parseEarthquakes,
  type Cyclone,
  type Earthquake,
  type EarthquakeSection,
  type FeedRead,
  type HazardFeedState,
  type HazardsResponse,
  type TyphoonSection,
} from "@/lib/hazards";
import type { Freshness } from "@/lib/types";
import { fetchJson, UpstreamRequestError } from "./http";

const base = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";
export const hazardDatasets = {
  significant: "E-A0015-001",
  local: "E-A0016-001",
  typhoon: "W-C0034-005",
} as const;
/** Earthquake reports can matter within minutes; cyclone analyses are issued a
 *  few times a day. Both are far below the agency's daily request allowance
 *  because one server answers every visitor from one cached copy. */
const quakeTtlMs = 3 * 60_000;
const typhoonTtlMs = 10 * 60_000;
const failureBackoffMs = 60_000;

/** The payload arrived but could not be read as this dataset. */
class UnreadablePayload extends Error {}

interface Read<T> {
  state: HazardFeedState;
  value: T | null;
  at: number | null;
  /** The value is the last good one, kept because a refresh failed. */
  retained: boolean;
}

/** One cached upstream dataset: a single request in flight at a time, a short
 *  back-off after a failure, and the last good reading kept (and flagged)
 *  rather than dropped when a refresh fails. */
export class CachedFeed<T> {
  private slot: { value: T; at: number } | null = null;
  private pending: Promise<Read<T>> | null = null;
  private retryAfter = 0;
  private failure: HazardFeedState = "unavailable";
  constructor(
    private name: string,
    private ttlMs: number,
    private load: () => Promise<T>,
    private now: () => number,
  ) {}

  async get(): Promise<Read<T>> {
    const now = this.now();
    if (this.slot && now - this.slot.at < this.ttlMs)
      return this.fromSlot(false);
    if (this.pending) return this.pending;
    if (now < this.retryAfter) return this.afterFailure();
    this.pending = this.refresh();
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }

  private async refresh(): Promise<Read<T>> {
    try {
      const value = await this.load();
      this.slot = { value, at: this.now() };
      this.retryAfter = 0;
      return this.fromSlot(false);
    } catch (error) {
      this.retryAfter = this.now() + failureBackoffMs;
      this.failure =
        error instanceof UnreadablePayload ? "unreadable" : "unavailable";
      console.warn("source_sync_failed", {
        source: this.name,
        retainedLastGood: !!this.slot,
        category:
          error instanceof UpstreamRequestError
            ? error.category
            : error instanceof UnreadablePayload
              ? "invalid-payload"
              : "unexpected",
        upstreamStatus:
          error instanceof UpstreamRequestError ? error.status : null,
      });
      return this.afterFailure();
    }
  }

  private fromSlot(retained: boolean): Read<T> {
    return {
      state: "ok",
      value: this.slot!.value,
      at: this.slot!.at,
      retained,
    };
  }
  private afterFailure(): Read<T> {
    return this.slot
      ? this.fromSlot(true)
      : { state: this.failure, value: null, at: null, retained: false };
  }
}

/** Field names and counts only, so a payload this code cannot read can be
 *  diagnosed from the logs without recording values or the request. */
function describeShape(payload: unknown) {
  const names = (value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value)
          .filter((key) => /^[A-Za-z0-9_]{1,40}$/.test(key))
          .slice(0, 30)
      : null;
  const root = payload as Record<string, unknown> | null;
  const records =
    root && typeof root === "object" ? (root.records as unknown) : null;
  const rootRecords = names(records);
  const firstHolder =
    records && typeof records === "object"
      ? Object.values(records as Record<string, unknown>)[0]
      : null;
  const holderName = rootRecords?.[0] ?? null;
  const items = Array.isArray(firstHolder)
    ? firstHolder
    : firstHolder && typeof firstHolder === "object"
      ? Object.values(firstHolder as Record<string, unknown>)[0]
      : null;
  return {
    rootType: Array.isArray(payload) ? "array" : typeof payload,
    rootKeys: names(payload),
    recordKeys: rootRecords,
    firstRecordHolder: holderName,
    firstHolderType: Array.isArray(firstHolder) ? "array" : typeof firstHolder,
    firstItemKeys: names(Array.isArray(items) ? items[0] : items),
  };
}

/** The nesting of a payload as names and types, never values, for the same
 *  reason: a record this code left out can then be understood from the logs. */
function typeTree(value: unknown, depth = 0): unknown {
  if (Array.isArray(value))
    return { list: value.length, first: typeTree(value[0], depth + 1) };
  if (value && typeof value === "object") {
    if (depth >= 12) return "object";
    const tree: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 40))
      if (/^[A-Za-z0-9_]{1,40}$/.test(key))
        tree[key] = typeTree(item, depth + 1);
    return tree;
  }
  return value === null ? "null" : typeof value;
}

function read<T>(
  name: string,
  payload: unknown,
  parse: (payload: unknown) => FeedRead<T>,
): FeedRead<T> {
  try {
    const result = parse(payload);
    if (result.excluded > 0)
      console.warn("source_record_excluded", {
        source: name,
        excluded: result.excluded,
        kept: result.items.length,
        shape: JSON.stringify(
          typeTree((payload as { records?: unknown } | null)?.records),
        ).slice(0, 3000),
      });
    return result;
  } catch {
    console.warn("source_payload_invalid", {
      source: name,
      ...describeShape(payload),
    });
    throw new UnreadablePayload();
  }
}

export class HazardService {
  private quakes: Record<
    "significant" | "local",
    CachedFeed<FeedRead<Earthquake>>
  >;
  private cyclones: CachedFeed<FeedRead<Cyclone>>;
  constructor(private deps = { fetchJson, now: () => Date.now() }) {
    const url = (id: string) => {
      const target = new URL(`${base}/${id}`);
      target.search = new URLSearchParams({
        Authorization: process.env.CWA_API_KEY ?? "",
        format: "JSON",
      }).toString();
      return target.toString();
    };
    const clock = () => this.deps.now();
    const quake = (feed: "significant" | "local") =>
      new CachedFeed(
        `cwa-${hazardDatasets[feed]}`,
        quakeTtlMs,
        async () =>
          read(
            hazardDatasets[feed],
            await this.deps.fetchJson(url(hazardDatasets[feed])),
            (p) => parseEarthquakes(p, feed),
          ),
        clock,
      );
    this.quakes = { significant: quake("significant"), local: quake("local") };
    this.cyclones = new CachedFeed(
      `cwa-${hazardDatasets.typhoon}`,
      typhoonTtlMs,
      async () =>
        read(
          hazardDatasets.typhoon,
          await this.deps.fetchJson(url(hazardDatasets.typhoon)),
          parseCyclones,
        ),
      clock,
    );
  }

  async get(): Promise<HazardsResponse> {
    const checkedAt = new Date(this.deps.now()).toISOString();
    if (!process.env.CWA_API_KEY) {
      const none = { retrievedAt: null, message: "CWA_API_KEY", excluded: 0 };
      return {
        checkedAt,
        earthquakes: {
          ...none,
          status: "not-configured",
          events: [],
          feeds: { significant: "not-configured", local: "not-configured" },
        },
        typhoon: {
          ...none,
          status: "not-configured",
          cyclones: [],
          feed: "not-configured",
        },
      };
    }
    const [significant, local, typhoon] = await Promise.all([
      this.quakes.significant.get(),
      this.quakes.local.get(),
      this.cyclones.get(),
    ]);
    return {
      checkedAt,
      earthquakes: this.earthquakeSection(significant, local),
      typhoon: this.typhoonSection(typhoon),
    };
  }

  private earthquakeSection(
    significant: Read<FeedRead<Earthquake>>,
    local: Read<FeedRead<Earthquake>>,
  ): EarthquakeSection {
    const feeds = { significant: significant.state, local: local.state };
    const used = [significant, local].filter((feed) => feed.value);
    if (!used.length)
      return {
        status: "unavailable",
        events: [],
        feeds,
        excluded: 0,
        retrievedAt: null,
        message:
          significant.state === "unreadable" || local.state === "unreadable"
            ? "unreadable-payload"
            : "upstream-unavailable",
      };
    const oldest = Math.min(...used.map((feed) => feed.at!));
    const status: Freshness = used.some((feed) => feed.retained)
      ? "stale"
      : "fresh";
    return {
      status,
      events: mergeEarthquakes(used.map((feed) => feed.value!.items)),
      feeds,
      excluded: used.reduce((n, feed) => n + feed.value!.excluded, 0),
      retrievedAt: new Date(oldest).toISOString(),
      message:
        used.length < 2
          ? "one-feed-missing"
          : status === "stale"
            ? "upstream-unavailable"
            : null,
    };
  }

  private typhoonSection(feed: Read<FeedRead<Cyclone>>): TyphoonSection {
    if (!feed.value)
      return {
        status: "unavailable",
        cyclones: [],
        feed: feed.state,
        excluded: 0,
        retrievedAt: null,
        message:
          feed.state === "unreadable"
            ? "unreadable-payload"
            : "upstream-unavailable",
      };
    const now = this.deps.now();
    const tracked = feed.value.items.filter((item) => isTracked(item, now));
    const older = feed.value.items.filter((item) => !isTracked(item, now));
    const newest = older
      .map((item) => item.current?.time ?? null)
      .filter((time): time is string => !!time)
      .sort()
      .pop();
    return {
      status: feed.retained ? "stale" : "fresh",
      cyclones: tracked,
      older: older.length
        ? { count: older.length, newestAt: newest ?? null }
        : null,
      feed: "ok",
      excluded: feed.value.excluded,
      retrievedAt: new Date(feed.at!).toISOString(),
      message: feed.retained ? "upstream-unavailable" : null,
    };
  }
}

const globalService = globalThis as typeof globalThis & {
  ecoatlasHazards?: HazardService;
};
export const hazardService = (globalService.ecoatlasHazards ??=
  new HazardService());
