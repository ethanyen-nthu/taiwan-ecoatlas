"use client";
import useSWR from "swr";
import { readFeed, savedDataset, type SavedCopy } from "@/lib/offline-copy";
import type { ReservoirResponse } from "@/lib/reservoirs";
import { useRefreshWhenOnline } from "../pwa/use-refresh-when-online";

/** The latest reservoir readings, refreshed every half hour. If a refresh
 *  fails the last good readings stay on screen, marked as stale. */
export function useReservoirs() {
  const { data, error, isValidating, mutate } = useSWR<{
    body: ReservoirResponse;
    saved: SavedCopy | null;
  }>(
    "/api/reservoirs",
    async (url: string) => {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error("Data unavailable");
      return readFeed<ReservoirResponse>(response, savedDataset);
    },
    {
      refreshInterval: 1800_000,
      dedupingInterval: 60000,
      shouldRetryOnError: false,
    },
  );
  useRefreshWhenOnline(data?.saved, () => void mutate());
  return {
    data:
      error && data
        ? {
            ...data.body,
            status: "stale" as const,
            message: "application-request-failed",
          }
        : data?.body || null,
    saved: data?.saved ?? null,
    loading: isValidating,
    error: !!error,
    refresh: () => void mutate(),
  };
}
