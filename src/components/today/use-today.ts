"use client";
import useSWR from "swr";
import { readFeed, savedToday, type SavedCopy } from "@/lib/offline-copy";
import { useRefreshWhenOnline } from "../pwa/use-refresh-when-online";
import type { TodaySummary } from "@/lib/today";

/** The few current numbers, refreshed every ten minutes. On a failed refresh
 *  the last good summary stays; with none, the strip simply does not show.
 *  Without a connection the copy saved on this device is used and marked
 *  (`saved`): its parts are "stale", never "fresh". */
export function useToday() {
  const { data, error, isLoading, mutate } = useSWR<{
    body: TodaySummary;
    saved: SavedCopy | null;
  }>(
    "/api/today",
    async (url: string) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error("Data unavailable");
      return readFeed<TodaySummary>(response, savedToday);
    },
    {
      refreshInterval: 600_000,
      dedupingInterval: 60_000,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    },
  );
  useRefreshWhenOnline(data?.saved, () => void mutate());
  return {
    today: data?.body ?? null,
    saved: data?.saved ?? null,
    loading: isLoading,
    error: !!error,
  };
}
