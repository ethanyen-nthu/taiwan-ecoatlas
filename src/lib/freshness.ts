import type { Freshness, ObservationKind } from "./types";
export const freshnessLimit: Record<ObservationKind, number> = {
  aqi: 2 * 3600_000,
  weather: 2 * 3600_000,
};
export function observationFreshness(
  kind: ObservationKind,
  observedAt: string | null,
  now = Date.now(),
): Freshness {
  if (!observedAt) return "unavailable";
  const timestamp = Date.parse(observedAt);
  if (!Number.isFinite(timestamp) || timestamp > now + 5 * 60_000)
    return "unavailable";
  return now - timestamp > freshnessLimit[kind] ? "stale" : "fresh";
}
