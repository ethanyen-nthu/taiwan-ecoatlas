"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { HazardsResponse } from "@/lib/hazards";
import { readFeed, savedHazards, type SavedCopy } from "@/lib/offline-copy";
import { useRefreshWhenOnline } from "../pwa/use-refresh-when-online";

/** Felt earthquakes and cyclone tracks, checked every three minutes. On a
 *  failed refresh the last good copy stays; with none, the layers say so.
 *  Without a connection the copy saved on this device is used, marked
 *  (`saved`) and judged again against the clock: a cyclone that was being
 *  tracked when it was saved is not shown as current once it no longer is. */
export function useHazards() {
  const { data, error, isLoading, mutate } = useSWR<{
    body: HazardsResponse;
    saved: SavedCopy | null;
  }>(
    "/api/hazards",
    async (url: string) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error("Data unavailable");
      // The clock is applied below, so a saved copy is judged at read time.
      return readFeed<HazardsResponse>(response, (body) => body);
    },
    {
      refreshInterval: 180_000,
      dedupingInterval: 60_000,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    },
  );
  const now = useNow();
  const saved = data?.saved ?? null;
  useRefreshWhenOnline(saved, () => void mutate());
  const body = data?.body;
  const shown = useMemo(
    () => (body && saved ? savedHazards(body, now) : (body ?? null)),
    [body, saved, now],
  );
  return { data: shown, saved, loading: isLoading, error: !!error };
}
export type HazardsHook = ReturnType<typeof useHazards>;

/** The time, refreshed each minute, so "3 h ago" does not go stale on screen. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
