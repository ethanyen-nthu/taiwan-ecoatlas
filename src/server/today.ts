import "server-only";
import type { DatasetResponse } from "@/lib/types";
import type { ReservoirResponse } from "@/lib/reservoirs";
import { summariseToday, type TodaySummary } from "@/lib/today";
import { observationService } from "./observations";
import { reservoirService } from "./reservoirs";

const emptyDataset = (source: string, checkedAt: string): DatasetResponse => ({
  source,
  status: "unavailable",
  observations: [],
  lastObservationAt: null,
  publishedAt: null,
  retrievedAt: null,
  checkedAt,
  excluded: 0,
  duplicates: 0,
  message: "upstream-unavailable",
});

/** The three live feeds, each already cached by its own service, boiled down
 *  to a few numbers. One feed failing leaves the others intact. */
export async function todaySummary(): Promise<TodaySummary> {
  const checkedAt = new Date().toISOString();
  const [air, weather, reservoirs] = await Promise.allSettled([
    observationService.get("aqi"),
    observationService.get("weather"),
    reservoirService.get(),
  ]);
  const reservoirsDown: ReservoirResponse = {
    status: "unavailable",
    readings: [],
    lastObservationAt: null,
    retrievedAt: null,
    checkedAt,
    message: "upstream-unavailable",
  };
  return summariseToday(
    air.status === "fulfilled" ? air.value : emptyDataset("aqi", checkedAt),
    weather.status === "fulfilled"
      ? weather.value
      : emptyDataset("weather", checkedAt),
    reservoirs.status === "fulfilled" ? reservoirs.value : reservoirsDown,
    checkedAt,
  );
}
