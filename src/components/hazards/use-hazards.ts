"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { HazardsResponse } from "@/lib/hazards";

/** Felt earthquakes and cyclone tracks, checked every three minutes. On a
 *  failed refresh the last good copy stays; with none, the layers say so. */
export function useHazards() {
  const { data, error, isLoading } = useSWR<HazardsResponse>(
    "/api/hazards",
    async (url: string) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error("Data unavailable");
      return response.json();
    },
    {
      refreshInterval: 180_000,
      dedupingInterval: 60_000,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    },
  );
  return { data: data ?? null, loading: isLoading, error: !!error };
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
