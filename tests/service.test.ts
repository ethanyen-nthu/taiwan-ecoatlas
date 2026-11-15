import { afterEach, describe, expect, it, vi } from "vitest";
import { ObservationService } from "@/server/observations";
import aqi from "./fixtures/aqi.json";
import weather from "./fixtures/weather.json";
import type { DatasetResponse } from "@/lib/types";
const now = Date.parse("2026-11-15T00:30:00Z");
afterEach(() => {
  vi.unstubAllEnvs();
});
function dependencies() {
  return {
    fetchJson: vi.fn().mockResolvedValue(aqi),
    readSnapshot: vi.fn().mockResolvedValue(null),
    writeSnapshot: vi.fn().mockResolvedValue(undefined),
    now: () => now,
  };
}
describe("server source reliability", () => {
  it("starts without keys and never fetches or invents observations", async () => {
    vi.stubEnv("MOENV_API_KEY", "");
    const deps = dependencies();
    const response = await new ObservationService(deps).get("aqi");
    expect(response.status).toBe("not-configured");
    expect(response.observations).toEqual([]);
    expect(deps.fetchJson).not.toHaveBeenCalled();
  });
  it("coalesces simultaneous requests and caches successful transformations", async () => {
    vi.stubEnv("MOENV_API_KEY", "test-key");
    const deps = dependencies(),
      service = new ObservationService(deps);
    const responses = await Promise.all([
      service.get("aqi"),
      service.get("aqi"),
      service.get("aqi"),
    ]);
    expect(deps.fetchJson).toHaveBeenCalledTimes(1);
    expect(responses[0].status).toBe("fresh");
    await service.get("aqi");
    expect(deps.fetchJson).toHaveBeenCalledTimes(1);
    expect(deps.writeSnapshot).toHaveBeenCalledTimes(1);
  });
  it("retains last valid data on upstream failure and backs off repeated failures", async () => {
    vi.stubEnv("MOENV_API_KEY", "test-key");
    const deps = dependencies();
    let clock = now;
    deps.now = () => clock;
    const service = new ObservationService(deps),
      first = await service.get("aqi");
    clock += 31 * 60_000;
    deps.fetchJson.mockRejectedValue(new Error("no network"));
    const failed = await service.get("aqi");
    expect(failed.status).toBe("stale");
    expect(failed.retrievedAt).toBe(first.retrievedAt);
    expect(failed.observations).toEqual(first.observations);
    await service.get("aqi");
    expect(deps.fetchJson).toHaveBeenCalledTimes(2);
  });
  it("restores a durable last-valid snapshot after a cold start", async () => {
    vi.stubEnv("MOENV_API_KEY", "test-key");
    const deps = dependencies();
    const saved = await new ObservationService(deps).get("aqi");
    const restored = dependencies();
    restored.now = () => now + 3600_000;
    restored.readSnapshot.mockResolvedValue(saved);
    restored.fetchJson.mockRejectedValue(new Error());
    expect((await new ObservationService(restored).get("aqi")).status).toBe(
      "stale",
    );
  });
  it("does not persist malformed responses over a valid snapshot", async () => {
    vi.stubEnv("MOENV_API_KEY", "test-key");
    const deps = dependencies();
    deps.fetchJson.mockResolvedValue({ records: [] });
    const response = await new ObservationService(deps).get("aqi");
    expect(response.status).toBe("unavailable");
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
  });
  it("merges both weather networks by station ID, retaining their actual source IDs", async () => {
    vi.stubEnv("CWA_API_KEY", "test-key");
    const deps = dependencies();
    deps.fetchJson.mockResolvedValue(weather);
    const response = await new ObservationService(deps).get("weather");
    expect(response.observations).toHaveLength(1);
    expect(response.duplicates).toBe(1);
    expect(deps.fetchJson).toHaveBeenCalledTimes(2);
  });
  it("rejects future dated records", async () => {
    vi.stubEnv("MOENV_API_KEY", "test-key");
    const deps = dependencies();
    deps.now = () => now - 86400_000;
    expect((await new ObservationService(deps).get("aqi")).status).toBe(
      "unavailable",
    );
  });
  it("does not call an old report fresh when fetched now", async () => {
    vi.stubEnv("MOENV_API_KEY", "test-key");
    const deps = dependencies();
    deps.now = () => now + 86400_000;
    const response: DatasetResponse = await new ObservationService(deps).get(
      "aqi",
    );
    expect(response.status).toBe("stale");
    expect(response.retrievedAt).not.toBe(response.lastObservationAt);
  });
});
