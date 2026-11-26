"use client";
import useSWR from "swr";
import type { TodaySummary } from "@/lib/today";

/** The few current numbers, refreshed every ten minutes. On a failed refresh
 *  the last good summary stays; with none, the strip simply does not show. */
export function useToday() {
  const { data, error, isLoading } = useSWR<TodaySummary>(
    "/api/today",
    async (url: string) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error("Data unavailable");
      return response.json();
    },
    {
      refreshInterval: 600_000,
      dedupingInterval: 60_000,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    },
  );
  return { today: data ?? null, loading: isLoading, error: !!error };
}
