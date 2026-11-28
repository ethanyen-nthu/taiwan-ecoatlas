import { describe, expect, it } from "vitest";
import type { Cyclone, HazardsResponse } from "@/lib/hazards";
import {
  asOfLabel,
  fromCacheHeader,
  oldestSaved,
  readFeed,
  savedAtHeader,
  savedCopyOf,
  savedDataset,
  savedHazards,
  savedToday,
  wantedPage,
} from "@/lib/offline-copy";
import type { TodaySummary } from "@/lib/today";
import type { DatasetResponse, Freshness } from "@/lib/types";

type Body = { status: Freshness; message: string | null };

const headers = (entries: Record<string, string>) => new Headers(entries);

describe("saved copies", () => {
  it("recognises only a response the worker marked as from its saved copy", () => {
    expect(savedCopyOf(headers({}))).toBeNull();
    expect(
      savedCopyOf(headers({ [savedAtHeader]: "2026-11-28T06:00:00Z" })),
    ).toBeNull();
    expect(
      savedCopyOf(
        headers({
          [fromCacheHeader]: "1",
          [savedAtHeader]: "2026-11-28T06:00:00Z",
        }),
      ),
    ).toEqual({ savedAt: "2026-11-28T06:00:00.000Z" });
  });

  it("keeps the fact that it is a saved copy when the time is missing or garbled", () => {
    expect(savedCopyOf(headers({ [fromCacheHeader]: "1" }))).toEqual({
      savedAt: null,
    });
    expect(
      savedCopyOf(headers({ [fromCacheHeader]: "1", [savedAtHeader]: "soon" })),
    ).toEqual({ savedAt: null });
  });

  it("never lets a saved dataset look fresh, and keeps a worse status as it was", () => {
    const base = { status: "fresh", message: null } as DatasetResponse;
    const marked = savedDataset(base);
    expect(marked.status).toBe("stale");
    expect(marked.message).toBe("saved-copy");
    expect(base.status).toBe("fresh");
    expect(savedDataset({ ...base, status: "unavailable" }).status).toBe(
      "unavailable",
    );
    expect(savedDataset({ ...base, status: "stale" }).status).toBe("stale");
  });

  const today = {
    checkedAt: "2026-11-28T06:00:00Z",
    air: { status: "fresh", latest: "2026-11-28T05:00:00Z" },
    weather: { status: "fresh", latest: "2026-11-28T05:50:00Z" },
    reservoirs: { status: "unavailable", latest: null },
    counties: { "63000": { air: null, weather: null } },
  } as unknown as TodaySummary;

  it("ages each part of the Today summary and leaves the numbers alone", () => {
    const marked = savedToday(today);
    expect(marked.air.status).toBe("stale");
    expect(marked.weather.status).toBe("stale");
    expect(marked.reservoirs.status).toBe("unavailable");
    expect(marked.air.latest).toBe(today.air.latest);
    expect(marked.counties).toBe(today.counties);
    expect(today.air.status).toBe("fresh");
  });

  const fix = (time: string | null) =>
    ({ time, longitude: 125, latitude: 20 }) as unknown as Cyclone["current"];
  const cyclone = (id: string, time: string | null, ahead?: string) =>
    ({
      id,
      nameEn: id,
      nameZh: null,
      number: null,
      past: [],
      current: fix(time),
      forecast: ahead ? [fix(ahead)] : [],
    }) as Cyclone;
  const hazards = (cyclones: Cyclone[]) =>
    ({
      checkedAt: "2026-11-28T06:00:00Z",
      earthquakes: { status: "fresh", events: [] },
      typhoon: { status: "fresh", cyclones, feed: {}, excluded: 0 },
    }) as unknown as HazardsResponse;
  const now = Date.parse("2026-12-01T06:00:00Z");

  it("judges a saved cyclone again against the clock", () => {
    const saved = hazards([
      cyclone("old", "2026-11-28T00:00:00Z"),
      cyclone("recent", "2026-11-30T12:00:00Z"),
      cyclone("forecast-ahead", "2026-11-28T00:00:00Z", "2026-12-02T00:00:00Z"),
    ]);
    const marked = savedHazards(saved, now);
    expect(marked.typhoon.cyclones.map((c) => c.id)).toEqual([
      "recent",
      "forecast-ahead",
    ]);
    expect(marked.typhoon.older).toEqual({
      count: 1,
      newestAt: "2026-11-28T00:00:00Z",
    });
    expect(marked.typhoon.status).toBe("stale");
    expect(marked.earthquakes.status).toBe("stale");
    expect(saved.typhoon.cyclones).toHaveLength(3);
  });

  it("adds to the older tracks the feed already named, and keeps the newest time", () => {
    const saved = hazards([cyclone("lapsed", "2026-11-27T00:00:00Z")]);
    saved.typhoon.older = { count: 2, newestAt: "2026-11-28T03:00:00Z" };
    const marked = savedHazards(saved, now);
    expect(marked.typhoon.older).toEqual({
      count: 3,
      newestAt: "2026-11-28T03:00:00Z",
    });
  });

  it("does not invent an older-tracks note when nothing lapsed", () => {
    const marked = savedHazards(
      hazards([cyclone("on", "2026-12-01T00:00:00Z")]),
      now,
    );
    expect(marked.typhoon.older).toBeUndefined();
    expect(marked.typhoon.cyclones).toHaveLength(1);
  });

  it("keeps a cyclone whose time is unknown, as the live page does", () => {
    const marked = savedHazards(hazards([cyclone("no-time", null)]), now);
    expect(marked.typhoon.cyclones).toHaveLength(1);
  });

  it("marks a feed's body only when it came from the saved copy", async () => {
    const body: Body = { status: "fresh", message: null };
    const live = await readFeed<Body>(
      new Response(JSON.stringify(body)),
      savedDataset,
    );
    expect(live).toEqual({ body, saved: null });
    const copy = await readFeed<Body>(
      new Response(JSON.stringify(body), {
        headers: {
          [fromCacheHeader]: "1",
          [savedAtHeader]: "2026-11-28T06:00:00Z",
        },
      }),
      savedDataset,
    );
    expect(copy.body.status).toBe("stale");
    expect(copy.saved?.savedAt).toBe("2026-11-28T06:00:00.000Z");
  });

  it("describes the oldest of several saved copies, and any with no time as having none", () => {
    expect(oldestSaved([null, undefined])).toBeNull();
    expect(
      oldestSaved([
        { savedAt: "2026-11-28T06:00:00.000Z" },
        null,
        { savedAt: "2026-11-27T06:00:00.000Z" },
      ]),
    ).toEqual({ savedAt: "2026-11-27T06:00:00.000Z" });
    expect(
      oldestSaved([{ savedAt: "2026-11-28T06:00:00.000Z" }, { savedAt: null }]),
    ).toEqual({ savedAt: null });
  });
});

describe("asOfLabel", () => {
  // 16:00 on 28 Nov in Taipei.
  const now = Date.parse("2026-11-28T08:00:00Z");

  it("gives the clock time for today in Taipei, in either language", () => {
    expect(asOfLabel("2026-11-28T06:10:00Z", now, "en")).toBe("14:10");
    expect(asOfLabel("2026-11-28T06:10:00Z", now, "zh")).toMatch(/2:10/);
  });

  it("says yesterday, then gives the date", () => {
    expect(asOfLabel("2026-11-27T06:10:00Z", now, "en")).toBe(
      "yesterday 14:10",
    );
    expect(asOfLabel("2026-11-27T06:10:00Z", now, "zh")).toMatch(
      /^昨天 .*2:10/,
    );
    expect(asOfLabel("2026-11-20T06:10:00Z", now, "en")).toBe("20 Nov 14:10");
    expect(asOfLabel("2026-11-20T06:10:00Z", now, "zh")).toMatch(/11.20.*2:10/);
  });

  it("counts days in Taipei, not in UTC", () => {
    // 00:30 on the 28th in Taipei; 15:50 UTC on the 27th is 23:50 on the 27th there.
    const justAfterMidnight = Date.parse("2026-11-27T16:30:00Z");
    expect(asOfLabel("2026-11-27T15:50:00Z", justAfterMidnight, "en")).toBe(
      "yesterday 23:50",
    );
    expect(asOfLabel("2026-11-27T16:10:00Z", justAfterMidnight, "en")).toBe(
      "00:10",
    );
  });

  it("returns nothing for a missing or unreadable time", () => {
    expect(asOfLabel(null, now, "en")).toBeNull();
    expect(asOfLabel(undefined, now, "en")).toBeNull();
    expect(asOfLabel("yesterday-ish", now, "en")).toBeNull();
  });

  it("does not call a time a little ahead of the clock a different day", () => {
    expect(asOfLabel("2026-11-28T08:03:00Z", now, "en")).toBe("16:03");
  });
});

describe("wantedPage", () => {
  it("returns to the page that was asked for", () => {
    expect(wantedPage("?from=%2Fcounty%2F63000")).toBe("/county/63000");
    expect(wantedPage("?from=%2Fsearch%3Fq%3Dtrees")).toBe("/search?q=trees");
  });

  it("goes home when there is nothing usable, and never to another address", () => {
    expect(wantedPage("")).toBe("/");
    expect(wantedPage("?from=")).toBe("/");
    expect(wantedPage("?from=county")).toBe("/");
    expect(wantedPage("?from=%2F%2Fevil.example")).toBe("/");
    expect(wantedPage("?from=https%3A%2F%2Fevil.example")).toBe("/");
    expect(wantedPage("?from=%2F%5Cevil.example")).toBe("/");
    expect(wantedPage("?from=javascript%3Aalert(1)")).toBe("/");
  });
});
