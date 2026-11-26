import "server-only";
import {
  joinReservoirs,
  parseDailyRows,
  parseStatusRows,
  type ReservoirResponse,
} from "@/lib/reservoirs";
import { fetchJson, UpstreamRequestError } from "./http";
import { sourceById } from "@/lib/sources";

const base = "https://opendata.wra.gov.tw/api/v2";
/** 水庫水情資料: the latest storage and water level (hourly or daily). */
const statusId = "2be9044c-6e44-4856-aad5-dd108c2e6679";
/** 水庫每日營運狀況: reservoir names and effective capacities. */
const dailyId = "51023e88-4c76-4dbc-bbb9-470da690d539";
const pageSize = 1000;
const freshForMs = 3 * 3600_000;

async function fetchAll(id: string, get: typeof fetchJson): Promise<unknown[]> {
  const all: unknown[] = [];
  for (let page = 1; page <= 5; page++) {
    const payload = await get(`${base}/${id}?page=${page}&size=${pageSize}`);
    if (!Array.isArray(payload)) throw new Error("Invalid reservoir payload");
    all.push(...payload);
    if (payload.length < pageSize) break;
  }
  return all;
}

export class ReservoirService {
  private cache: ReservoirResponse | null = null;
  private pending: Promise<ReservoirResponse> | null = null;
  private retryAfter = 0;
  constructor(private deps = { fetchJson, now: () => Date.now() }) {}

  async get(): Promise<ReservoirResponse> {
    const now = this.deps.now();
    const ttl = (sourceById("reservoirs").cacheSeconds ?? 1800) * 1000;
    if (
      this.cache &&
      (now < this.retryAfter || now - Date.parse(this.cache.retrievedAt!) < ttl)
    )
      return this.age(this.cache);
    if (this.pending) return this.age(await this.pending);
    if (now < this.retryAfter) return this.empty();
    this.pending = this.refresh();
    try {
      return this.age(await this.pending);
    } finally {
      this.pending = null;
    }
  }

  private async refresh(): Promise<ReservoirResponse> {
    try {
      const [statusPayload, dailyPayload] = await Promise.all([
        fetchAll(statusId, this.deps.fetchJson),
        fetchAll(dailyId, this.deps.fetchJson),
      ]);
      const status = parseStatusRows(statusPayload).rows;
      const daily = parseDailyRows(dailyPayload);
      const now = this.deps.now();
      // A reading time in the future is not shown as a current observation.
      const valid = status.filter(
        (row) => Date.parse(row.observedAt) <= now + 300_000,
      );
      if (!valid.length)
        throw new Error("No reservoir readings with valid times");
      const readings = joinReservoirs(valid, daily);
      const last = readings.reduce(
        (latest, r) => (r.observedAt > latest ? r.observedAt : latest),
        "",
      );
      const stamp = new Date(now).toISOString();
      const result: ReservoirResponse = {
        status: now - Date.parse(last) > freshForMs ? "stale" : "fresh",
        readings,
        lastObservationAt: last,
        retrievedAt: stamp,
        checkedAt: stamp,
        message: null,
      };
      this.cache = result;
      this.retryAfter = 0;
      return result;
    } catch (error) {
      this.retryAfter = this.deps.now() + 60_000;
      console.warn("source_sync_failed", {
        source: "reservoirs",
        retainedSnapshot: !!this.cache,
        category:
          error instanceof UpstreamRequestError
            ? error.category
            : "invalid-payload",
        upstreamStatus:
          error instanceof UpstreamRequestError ? error.status : null,
      });
      if (this.cache) {
        this.cache = {
          ...this.cache,
          status: "stale",
          checkedAt: new Date(this.deps.now()).toISOString(),
          message: "upstream-unavailable",
        };
        return this.cache;
      }
      return this.empty();
    }
  }

  private age(result: ReservoirResponse): ReservoirResponse {
    if (!result.readings.length || result.message === "upstream-unavailable")
      return result;
    const last = Date.parse(result.lastObservationAt ?? "");
    return {
      ...result,
      status:
        Number.isFinite(last) && this.deps.now() - last <= freshForMs
          ? "fresh"
          : "stale",
    };
  }

  private empty(): ReservoirResponse {
    return {
      status: "unavailable",
      readings: [],
      lastObservationAt: null,
      retrievedAt: null,
      checkedAt: new Date(this.deps.now()).toISOString(),
      message: "upstream-unavailable",
    };
  }
}

const globalService = globalThis as typeof globalThis & {
  ecoatlasReservoirs?: ReservoirService;
};
export const reservoirService = (globalService.ecoatlasReservoirs ??=
  new ReservoirService());
