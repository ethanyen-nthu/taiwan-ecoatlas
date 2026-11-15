import "server-only";
import { fetchJson } from "./http";
import type { DatasetResponse, ObservationKind } from "@/lib/types";
function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}
export async function readSnapshot(
  kind: ObservationKind,
): Promise<DatasetResponse | null> {
  const config = configuration();
  if (!config) return null;
  try {
    const rows = (await fetchJson(
      `${config.url}/rest/v1/source_snapshots?source_id=eq.${kind}&select=payload&limit=1`,
      { headers: config.headers },
      1,
    )) as { payload: DatasetResponse }[];
    const payload = rows[0]?.payload;
    return payload &&
      Array.isArray(payload.observations) &&
      payload.source === kind &&
      payload.retrievedAt
      ? payload
      : null;
  } catch {
    console.warn("snapshot_read_failed", { source: kind });
    return null;
  }
}
export async function writeSnapshot(
  kind: ObservationKind,
  payload: DatasetResponse,
): Promise<void> {
  const config = configuration();
  if (!config) return;
  try {
    const response = await fetch(
      `${config.url}/rest/v1/source_snapshots?on_conflict=source_id`,
      {
        method: "POST",
        headers: {
          ...config.headers,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          source_id: kind,
          payload,
          retrieved_at: payload.retrievedAt,
        }),
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Snapshot write failed");
  } catch {
    console.warn("snapshot_write_failed", { source: kind });
  }
}
export async function recordSync(
  kind: ObservationKind,
  payload: DatasetResponse,
  startedAt: string,
) {
  const config = configuration();
  if (!config) return;
  const failed = payload.message === "upstream-unavailable";
  try {
    const responses = await Promise.all([
      fetch(`${config.url}/rest/v1/source_sync_runs`, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify({
          source_id: kind,
          started_at: startedAt,
          finished_at: payload.checkedAt,
          status: failed ? "failed" : "success",
          accepted_count: payload.observations.length,
          excluded_count: payload.excluded,
          duplicate_count: payload.duplicates,
          error_code: failed ? "upstream-unavailable" : null,
        }),
        signal: AbortSignal.timeout(3000),
      }),
      fetch(`${config.url}/rest/v1/environmental_sources?id=eq.${kind}`, {
        method: "PATCH",
        headers: config.headers,
        body: JSON.stringify({
          // A failed snapshot read must not erase previously recorded successful times.
          ...(payload.lastObservationAt
            ? { last_observation_at: payload.lastObservationAt }
            : {}),
          ...(payload.retrievedAt
            ? { last_successful_retrieval_at: payload.retrievedAt }
            : {}),
          synchronization_status: payload.status,
        }),
        signal: AbortSignal.timeout(3000),
      }),
    ]);
    if (responses.some((r) => !r.ok))
      throw new Error("Sync metadata write failed");
  } catch {
    console.warn("sync_metadata_write_failed", { source: kind });
  }
}
