import { afterEach, expect, it, vi } from "vitest";
import { recordSync } from "@/server/snapshots";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("does not erase last-success timestamps when both upstream and snapshot reads fail", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://database.example.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "TEST_SERVICE_KEY");
  const fetch = vi
    .fn()
    .mockImplementation(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  await recordSync(
    "aqi",
    {
      source: "aqi",
      status: "unavailable",
      observations: [],
      lastObservationAt: null,
      publishedAt: null,
      retrievedAt: null,
      checkedAt: "2026-11-15T00:00:00Z",
      excluded: 0,
      duplicates: 0,
      message: "upstream-unavailable",
    },
    "2026-11-15T00:00:00Z",
  );
  const patch = fetch.mock.calls.find((call) => call[1].method === "PATCH");
  expect(JSON.parse(patch![1].body)).toEqual({
    synchronization_status: "unavailable",
  });
  const audit = fetch.mock.calls.find((call) => call[1].method === "POST");
  expect(JSON.parse(audit![1].body)).toMatchObject({
    status: "failed",
    error_code: "upstream-unavailable",
  });
});
