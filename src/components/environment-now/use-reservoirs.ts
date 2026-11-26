"use client";
import useSWR from "swr";
import type { ReservoirResponse } from "@/lib/reservoirs";

/** The latest reservoir readings, refreshed every half hour. If a refresh
 *  fails the last good readings stay on screen, marked as stale. */
export function useReservoirs() {
  const { data, error, isValidating, mutate } = useSWR<ReservoirResponse>(
    "/api/reservoirs",
    async (url: string) => {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error("Data unavailable");
      return response.json();
    },
    {
      refreshInterval: 1800_000,
      dedupingInterval: 60000,
      shouldRetryOnError: false,
    },
  );
  return {
    data:
      error && data
        ? {
            ...data,
            status: "stale" as const,
            message: "application-request-failed",
          }
        : data || null,
    loading: isValidating,
    error: !!error,
    refresh: () => void mutate(),
  };
}
