"use client";
import { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import type {
  Counties,
  DatasetResponse,
  Language,
  ObservationKind,
} from "@/lib/types";
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (next: Language) => void;
  t: (en: string, zh: string) => string;
} | null>(null);
export function Providers({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ecoatlas-language");
      // Restore the explicit preference after hydration so server/client markup agrees.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "en" || saved === "zh") setLanguageState(saved);
    } catch {
      /* Storage may be disabled. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
  }, [language]);
  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem("ecoatlas-language", next);
    } catch {}
  };
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: (en, zh) => (language === "en" ? en : zh),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("Language provider missing");
  return context;
}
export function useCounties() {
  const { data, error, mutate } = useSWRImmutable<Counties>(
    "/data/counties.geojson",
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Official boundaries unavailable");
      const counties = (await response.json()) as Counties;
      if (
        counties.type !== "FeatureCollection" ||
        counties.features?.length !== 22
      )
        throw new Error("Invalid official boundary archive");
      return counties;
    },
    { shouldRetryOnError: false },
  );
  return {
    counties: data || null,
    boundaryError: !!error,
    retryBoundaries: () => void mutate(),
  };
}
export function useObservations(kind: ObservationKind) {
  const { data, error, isValidating, mutate } = useSWR<DatasetResponse>(
    `/api/observations/${kind}`,
    async (url: string) => {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error("Data unavailable");
      return response.json();
    },
    {
      refreshInterval: kind === "aqi" ? 1800_000 : 600_000,
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
