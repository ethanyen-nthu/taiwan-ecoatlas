import "server-only";
import { sourceById } from "@/lib/sources";
import { observationFreshness } from "@/lib/freshness";
import { normalize, parseAqi, parseWeather } from "@/lib/transform";
import type { DatasetResponse, ObservationKind } from "@/lib/types";
import { fetchJson, UpstreamRequestError } from "./http";
import { readSnapshot, writeSnapshot, recordSync } from "./snapshots";

export class ObservationService {
  private cache = new Map<ObservationKind, DatasetResponse>();
  private pending = new Map<ObservationKind, Promise<DatasetResponse>>();
  private retryAfter = new Map<ObservationKind, number>();
  constructor(
    private deps = {
      fetchJson,
      readSnapshot,
      writeSnapshot,
      now: () => Date.now(),
    },
  ) {}

  async get(kind: ObservationKind): Promise<DatasetResponse> {
    const key =
      kind === "aqi" ? process.env.MOENV_API_KEY : process.env.CWA_API_KEY;
    const now = this.deps.now();
    if (!key)
      return this.empty(
        kind,
        "not-configured",
        kind === "aqi" ? "MOENV_API_KEY" : "CWA_API_KEY",
      );
    const cached = this.cache.get(kind);
    if (
      cached &&
      (now < (this.retryAfter.get(kind) || 0) ||
        now - Date.parse(cached.retrievedAt || "") <
          sourceById(kind).cacheSeconds! * 1000)
    )
      return this.age(cached);
    const pending = this.pending.get(kind);
    if (pending) return this.age(await pending);
    if (now < (this.retryAfter.get(kind) || 0))
      return this.empty(kind, "unavailable", "upstream-unavailable");
    const request = this.refresh(kind, key);
    this.pending.set(kind, request);
    try {
      return this.age(await request);
    } finally {
      this.pending.delete(kind);
    }
  }

  private async refresh(
    kind: ObservationKind,
    key: string,
  ): Promise<DatasetResponse> {
    const startedAt = new Date(this.deps.now()).toISOString();
    let cached = this.cache.get(kind);
    if (!cached) {
      const saved = await this.deps.readSnapshot(kind);
      if (saved) {
        cached = saved;
        this.cache.set(kind, saved);
      }
    }
    if (
      cached &&
      this.deps.now() - Date.parse(cached.retrievedAt || "") <
        sourceById(kind).cacheSeconds! * 1000
    )
      return cached;
    try {
      let parsed: ReturnType<typeof parseAqi>;
      if (kind === "aqi") {
        const url = new URL("https://data.moenv.gov.tw/api/v2/AQX_P_432");
        url.search = new URLSearchParams({
          api_key: key,
          limit: "1000",
          sort: "ImportDate desc",
          format: "json",
        }).toString();
        const payload = await this.deps.fetchJson(url.toString());
        try {
          parsed = parseAqi(payload);
        } catch (error) {
          // Schema diagnostics contain counts and allowlisted field-presence flags only.
          // Provider error messages and raw values can echo credential-bearing requests.
          const root =
            payload && typeof payload === "object" && !Array.isArray(payload)
              ? (payload as Record<string, unknown>)
              : {};
          const records = Array.isArray(payload) ? payload : root.records;
          const first = Array.isArray(records) ? records[0] : null;
          const row =
            first && typeof first === "object"
              ? (first as Record<string, unknown>)
              : {};
          const rowFields = Object.keys(row).map((key) => key.toLowerCase());
          const errorText = [root.error, root.message, root.error_msg]
            .flatMap((item) => {
              if (typeof item === "string") return [item];
              if (
                item &&
                typeof item === "object" &&
                "message" in item &&
                typeof item.message === "string"
              )
                return [item.message];
              return [];
            })
            .join(" ");
          console.warn("source_payload_invalid", {
            source: kind,
            rootType: Array.isArray(payload) ? "array" : typeof payload,
            rootArrayLength: Array.isArray(payload) ? payload.length : null,
            knownFields: [
              "records",
              "fields",
              "total",
              "error",
              "error_msg",
              "message",
              "status",
              "code",
              "success",
              "result",
              "data",
            ].filter((key) => key in root),
            recordCount: Array.isArray(records) ? records.length : null,
            recordType: typeof records,
            stationFields: [
              "siteid",
              "sitename",
              "longitude",
              "latitude",
              "publishtime",
              "aqi",
            ].filter((key) => rowFields.includes(key)),
            stationIdType: typeof Object.entries(row).find(
              ([key]) => key.toLowerCase() === "siteid",
            )?.[1],
            authorizationErrorHint:
              /invalid.*(?:api[_ -]?key|authorization)|(?:api[_ -]?key).*invalid|unauthorized|forbidden|授權.*(?:錯誤|無效)/i.test(
                errorText,
              ),
            queryErrorHint: /sort|importdate|column/i.test(errorText),
            quotaErrorHint: /quota.*exceed|too many|rate limit/i.test(
              errorText,
            ),
          });
          throw error;
        }
      } else {
        const ids = ["O-A0003-001", "O-A0001-001"];
        // A partial network response retains the last complete snapshot.
        const results = await Promise.all(
          ids.map(async (id) => {
            const url = new URL(
              `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${id}`,
            );
            url.search = new URLSearchParams({
              Authorization: key,
              format: "JSON",
            }).toString();
            return parseWeather(await this.deps.fetchJson(url.toString()), id);
          }),
        );
        parsed = normalize(
          results.flatMap((r) => r.observations),
          results.reduce((n, r) => n + r.excluded, 0),
        );
        parsed.duplicates += results.reduce((n, r) => n + r.duplicates, 0);
      }
      // Reject future timestamps rather than displaying them as current observations.
      const valid = parsed.observations.filter(
        (o) => Date.parse(o.observedAt) <= this.deps.now() + 300_000,
      );
      parsed.excluded += parsed.observations.length - valid.length;
      if (!valid.length) throw new Error("No observations with valid times");
      parsed.observations = valid;
      const lastObservationAt = valid.reduce(
        (latest, o) => (o.observedAt > latest ? o.observedAt : latest),
        "",
      );
      const publications = valid
        .map((o) => o.publishedAt)
        .filter((v): v is string => !!v)
        .sort();
      const timestamp = new Date(this.deps.now()).toISOString();
      const result: DatasetResponse = {
        source: kind,
        ...parsed,
        status: observationFreshness(kind, lastObservationAt, this.deps.now()),
        lastObservationAt,
        publishedAt: publications.at(-1) || null,
        retrievedAt: timestamp,
        checkedAt: timestamp,
        message: null,
      };
      this.cache.set(kind, result);
      this.retryAfter.delete(kind);
      await this.deps.writeSnapshot(kind, result);
      await recordSync(kind, result, startedAt);
      console.info("source_sync_success", {
        source: kind,
        count: valid.length,
        excluded: parsed.excluded,
        duplicates: parsed.duplicates,
      });
      return result;
    } catch (error) {
      this.retryAfter.set(kind, this.deps.now() + 60_000);
      console.warn("source_sync_failed", {
        source: kind,
        retainedSnapshot: !!cached,
        category:
          error instanceof UpstreamRequestError
            ? error.category
            : "invalid-payload",
        upstreamStatus:
          error instanceof UpstreamRequestError ? error.status : null,
        networkCode:
          error instanceof UpstreamRequestError ? error.networkCode : null,
      });
      if (cached) {
        const stale: DatasetResponse = {
          ...cached,
          status: "stale",
          checkedAt: new Date(this.deps.now()).toISOString(),
          message: "upstream-unavailable",
        };
        this.cache.set(kind, stale);
        await recordSync(kind, stale, startedAt);
        return stale;
      }
      const unavailable = this.empty(
        kind,
        "unavailable",
        "upstream-unavailable",
      );
      await recordSync(kind, unavailable, startedAt);
      return unavailable;
    }
  }
  private age(result: DatasetResponse): DatasetResponse {
    if (!result.observations.length) return result;
    return {
      ...result,
      status:
        result.message === "upstream-unavailable"
          ? "stale"
          : observationFreshness(
              result.source as ObservationKind,
              result.lastObservationAt,
              this.deps.now(),
            ),
    };
  }
  private empty(
    kind: ObservationKind,
    status: "not-configured" | "unavailable",
    message: string,
  ): DatasetResponse {
    return {
      source: kind,
      status,
      message,
      observations: [],
      lastObservationAt: null,
      publishedAt: null,
      retrievedAt: null,
      checkedAt: new Date(this.deps.now()).toISOString(),
      excluded: 0,
      duplicates: 0,
    };
  }
}
const globalService = globalThis as typeof globalThis & {
  ecoatlasObservations?: ObservationService;
};
export const observationService = (globalService.ecoatlasObservations ??=
  new ObservationService());
